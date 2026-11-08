// Created by Ralph Schnarkowski with the help of Claude AI, July-29, 2026
// Extended for batch API support, August 2026
// feel free to use, change, enhance!

module.exports = function (app) {
  const plugin = {};
  const fs = require('fs');
  const path = require('path');
  const https = require('https');
  const http = require('http');
//  const Jimp = require('jimp'); // Using jimp package as an optional dependency

  // Kamerabilder werden auf diese maximale Kantenlaenge (lange Seite) begrenzt, bevor sie
  // an die Skipperblogs-API gesendet werden - das haelt die Batch-Payloads (und damit die
  // Offline-Queue-Datei) in einem vernuenftigen Rahmen.
  const MAX_IMAGE_DIMENSION_PX = 1600;

  plugin.id = 'signalk-skipperblogs-tracking';
  plugin.name = 'Skipperblogs Tracking';
  plugin.description = 'Sends GPS-position along with speed and course (if avalable) periodically to Skipperblogs at a configurable interval. Positions that cannot be sent while offline are sent once internet connection is re-established.';

  const BATCH_API_URL = 'https://www.skipperblogs.com/tracking/signalk';

  let timer = null;

  // --- Warteschlange fuer Positionen, die wegen fehlender Internetverbindung
  // (noch) nicht gesendet werden konnten ---
  let queueFile = null; // wird erst in plugin.start() gesetzt
  let queue = []; // Array von { lat, lon, timestamp, sog, cog }
  let flushing = false; // verhindert ueberlappende Abarbeitung der Queue

  function loadQueue() {
    try {
      const raw = fs.readFileSync(queueFile, 'utf8');
      queue = JSON.parse(raw);
      if (!Array.isArray(queue)) queue = [];
      app.debug(`Loaded ${queue.length} pending position(s) from queue file.`);
    } catch (e) {
      queue = [];
      app.debug('No pending queue found, starting with an empty queue.');
    }
  }

  function saveQueue() {
    try {
      fs.writeFileSync(queueFile, JSON.stringify(queue));
    } catch (e) {
      app.error('Queue could not be saved: ' + e.message);
    }
  }

  // Neuen Eintrag hinten anhaengen und Obergrenze durchsetzen (aelteste zuerst verwerfen)
  function enqueue(item, maxQueueSize) {
    queue.push(item);
    if (queue.length > maxQueueSize) {
      const dropped = queue.length - maxQueueSize;
      queue.splice(0, dropped);
      app.error(
        `Queue exceeded max. size (${maxQueueSize}), dropped ${dropped} oldest pending position(s).`
      );
    }
    saveQueue();
  }

  // Baut aus einem internen Queue-Item das Waypoint-Objekt im Format der Batch-API.
  function toWaypoint(item) {
    const wp = {
      lat: item.lat,
      lng: item.lon,
      timestamp: item.timestamp
    };

    const data = {};
    if (typeof item.cog === 'number') data.cog = Math.round(item.cog);
    if (typeof item.sog === 'number') data.sog = item.sog;
    if (Object.keys(data).length > 0) wp.data = data;

    if (item.image) wp.image = item.image; // bereits fertiger "data:image/jpeg;base64,..." String

    return wp;
  }

  // Low-level Batch-API-Call. items ist ein Array interner Queue-Items (min. 1 Eintrag).
  // Ruft callback(err, statusCode, body) auf.
  // err ist gesetzt bei Netzwerk-/Verbindungsproblemen oder Timeout (typischerweise
  // wenn die Internetverbindung unterbrochen ist) - in diesem Fall ist statusCode undefined.
  function postBatchToApi(items, apiKey, callback) {
    const payload = JSON.stringify({
      key: apiKey,
      waypoints: items.map(toWaypoint)
    });

    const url = new URL(BATCH_API_URL);
    const reqOptions = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 20000
    };

    const req = https.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => callback(null, res.statusCode, body));
    });

    req.on('timeout', () => {
      req.destroy(new Error('Request timed out'));
    });

    req.on('error', (err) => {
      callback(err);
    });

    req.write(payload);
    req.end();
  }

  // Versucht, einen Batch (1..n Items) zu senden.
  // Aktuelle Annahme (TODO: ggf. anpassen, sobald das genaue Response-Format bekannt ist):
  // Der Batch wird als Ganzes akzeptiert oder abgelehnt - es gibt keine Teilerfolge.
  // Bei Erfolg: gesamter Batch gilt als gesendet.
  // Bei Netzwerkfehler/5xx: gesamter Batch bleibt (bzw. wird neu) in der Queue.
  // Bei 4xx (z.B. falscher API-Key): Batch wird verworfen (erneutes Senden wuerde nichts aendern).
  function trySendBatch(items, options, isFromQueue, callback) {
    postBatchToApi(items, options.apiKey, (err, statusCode, body) => {
      if (!err && statusCode >= 200 && statusCode < 300) {
        app.debug(`Batch of ${items.length} position(s) sent (Status ${statusCode})`);
        callback(true);
        return;
      }

      if (err) {
        app.error(
          `Could not reach Skipperblogs (probably no internet connection): ${err.message}. ` +
            (isFromQueue ? 'Keeping batch in queue.' : 'Queuing position(s) for later retry.')
        );
        if (!isFromQueue) items.forEach((item) => enqueue(item, options.maxQueueSize));
        callback(false);
        return;
      }

      if (statusCode >= 500) {
        app.error(
          `Skipperblogs server error (Status ${statusCode}). ` +
            (isFromQueue ? 'Keeping batch in queue.' : 'Queuing position(s) for later retry.')
        );
        if (!isFromQueue) items.forEach((item) => enqueue(item, options.maxQueueSize));
        callback(false);
        return;
      }

      // Client-Fehler (z.B. 4xx wegen falschem API-Key oder ungueltigem Eintrag im Batch) -
      // erneutes Senden wuerde vermutlich nichts aendern, daher nicht (erneut) in die Queue aufnehmen.
      app.error(`Skipperblogs API error: Status ${statusCode}, Body: ${body}`);
      callback(false, true /* permanentError */);
    });
  }

  // Arbeitet die Warteschlange in Chunks von max. options.maxBatchSize Eintraegen ab,
  // mit einer kleinen Pause zwischen den einzelnen Batch-Requests (um die API nicht zu
  // fluten). Bricht die Abarbeitung ab, sobald ein Batch wegen eines Verbindungsproblems
  // fehlschlaegt, da die Internetverbindung dann vermutlich weiterhin unterbrochen ist.
  function flushQueue(options, done) {
    if (flushing || queue.length === 0) {
      if (done) done();
      return;
    }
    flushing = true;
    app.debug(`Trying to flush ${queue.length} pending position(s) from queue.`);

    function next() {
      if (queue.length === 0) {
        flushing = false;
        if (done) done();
        return;
      }

      const chunk = queue.slice(0, options.maxBatchSize);
      trySendBatch(chunk, options, true, (success, permanentError) => {
        if (success || permanentError) {
          queue.splice(0, chunk.length);
          saveQueue();
          setTimeout(next, options.retryDelaySeconds * 1000);
        } else {
          // Verbindung offenbar noch unterbrochen -> Rest der Queue fuer diesen Durchlauf stehen lassen
          flushing = false;
          if (done) done();
        }
      });
    }

    next();
  }

  // Liest speedOverGround (m/s, wie von der API erwartet) und courseOverGroundTrue
  // (rad -> Grad 0-359) aus Signal K, falls verfuegbar. Gibt undefined zurueck, wenn kein Wert da ist.
  function readSpeedAndCourse() {
    let sog; // m/s, so wie die API es erwartet
    let cog; // Grad 0-359

    const sogPath = app.getSelfPath('navigation.speedOverGround');
    if (sogPath && typeof sogPath.value === 'number') {
      sog = sogPath.value;
    }

    const cogPath = app.getSelfPath('navigation.courseOverGroundTrue');
    if (cogPath && typeof cogPath.value === 'number') {
      cog = (cogPath.value * 180) / Math.PI; // Radiant -> Grad
      if (cog < 0) cog += 360;
    }

    return { sog, cog };
  }

  // Holt ein einzelnes Snapshot-Bild von der konfigurierten IP-Kamera-URL und liefert es
  // als fertigen "data:<mime>;base64,..."-String an den Callback. Ein Fehler beim Abrufen
  // (Kamera nicht erreichbar, Timeout, HTTP-Fehlerstatus) darf niemals das Senden der
  // Position selbst verhindern - der Aufrufer behandelt err entsprechend und sendet dann
  // eben ohne Bild.

  function fetchCameraSnapshot(snapshotUrl, username, password, timeoutMs, callback) {
    let parsed;
    try {
      parsed = new URL(snapshotUrl);
    } catch (e) {
      callback(new Error('Invalid camera snapshot URL: ' + e.message));
      return;
    }

    const client = parsed.protocol === 'https:' ? https : http;
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'GET',
      timeout: timeoutMs
    };
    if (username) {
      reqOptions.auth = `${username}:${password || ''}`;
    }

    const req = client.request(reqOptions, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume(); // Antwort-Body verwerfen, damit die Verbindung sauber geschlossen wird
        callback(new Error(`Camera snapshot HTTP ${res.statusCode}`));
        return;
      }
      const contentType = (res.headers['content-type'] || 'image/jpeg').split(';')[0].trim();
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', async () => {
        let buffer = Buffer.concat(chunks);
        let outContentType = contentType;

        try {
          const image = await Jimp.read(buffer);
          const longSide = Math.max(image.bitmap.width, image.bitmap.height);
          if (longSide > MAX_IMAGE_DIMENSION_PX) {
            app.debug(
              `Camera image is ${image.bitmap.width}x${image.bitmap.height}px (long side ${longSide}px) ` +
                `- resizing down to ${MAX_IMAGE_DIMENSION_PX}px on the long side.`
            );
            if (image.bitmap.width >= image.bitmap.height) {
              image.resize(MAX_IMAGE_DIMENSION_PX, Jimp.AUTO);
            } else {
              image.resize(Jimp.AUTO, MAX_IMAGE_DIMENSION_PX);
            }
            buffer = await image.getBufferAsync(Jimp.MIME_JPEG);
            outContentType = 'image/jpeg';
          }
        } catch (e) {
          // Bild konnte nicht gelesen/skaliert werden (z.B. unbekanntes Format) - lieber
          // unveraendert senden als das Senden der Position komplett zu verhindern.
          app.error(`Could not inspect/resize camera image, sending as originally received: ${e.message}`);
        }

        const base64 = buffer.toString('base64');
        callback(null, `data:${outContentType};base64,${base64}`);
      });
    });

    req.on('timeout', () => {
      req.destroy(new Error('Camera snapshot request timed out'));
    });
    req.on('error', (err) => callback(err));
    req.end();
  }

  function checkAndSend(options) {
    // Zuerst versuchen, evtl. waehrend einer frueheren Verbindungsunterbrechung
    // aufgelaufene Positionen nachzusenden.
    flushQueue(options, () => {
      const posPath = app.getSelfPath('navigation.position');
      if (!posPath || !posPath.value) {
        app.debug('No current position available (navigation.position is empty)');
        return;
      }

      const { latitude, longitude } = posPath.value;
      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        app.debug('Position incomplete, skipping this loop');
        return;
      }

      const extra = readSpeedAndCourse();
      const ts = Math.floor(Date.now() / 1000);

      function sendItem(imageDataUri) {
        const item = {
          lat: latitude,
          lon: longitude,
          timestamp: ts,
          sog: extra.sog,
          cog: extra.cog
        };
        if (imageDataUri) item.image = imageDataUri;
        trySendBatch([item], options, false, () => {});
      }

      if (options.cameraSnapshotUrl) {
        fetchCameraSnapshot(
          options.cameraSnapshotUrl,
          options.cameraUsername,
          options.cameraPassword,
          options.cameraTimeoutSeconds * 1000,
          (err, dataUri) => {
            if (err) {
              app.error(`Could not fetch camera snapshot: ${err.message}. Sending position without image.`);
              sendItem(undefined);
            } else {
              app.debug(`Camera snapshot fetched (${Math.round(dataUri.length / 1024)} KB base64).`);
              sendItem(dataUri);
            }
          }
        );
      } else {
        sendItem(undefined);
      }
    });
  }

  plugin.start = function (options) {
    queueFile = path.join(app.getDataDirPath(), 'pendingQueue.json');
    loadQueue();

    const opts = {
      apiKey: options.apiKey,
      checkIntervalMinutes: Math.max(
        30,
        typeof options.checkIntervalMinutes === 'number' ? options.checkIntervalMinutes : 30
      ),
      maxQueueSize:
        typeof options.maxQueueSize === 'number' ? options.maxQueueSize : 500,
      retryDelaySeconds: 5,
      maxBatchSize: 20000,
      cameraSnapshotUrl: options.cameraSnapshotUrl || null,
      cameraUsername: options.cameraUsername || null,
      cameraPassword: options.cameraPassword || null,
      cameraTimeoutSeconds:
        typeof options.cameraTimeoutSeconds === 'number' ? options.cameraTimeoutSeconds : 10
    };

    if (!opts.apiKey) {
      app.error('No API-Key configured - Plugin will not be started.');
      return;
    }

    if (typeof options.checkIntervalMinutes === 'number' && options.checkIntervalMinutes < 15) {
      app.error(
        `Configured check interval (${options.checkIntervalMinutes} min) is below the minimum of 15 min - using 15 min instead.`
      );
    }

    checkAndSend(opts); // direkt einmal pruefen beim Start
    timer = setInterval(() => checkAndSend(opts), opts.checkIntervalMinutes * 60 * 1000);
    app.debug('Skipperblog Tracker started with options: ' + JSON.stringify(opts));
  };

  plugin.stop = function () {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  plugin.schema = {
    type: 'object',
    required: ['apiKey'],
    properties: {
      apiKey: {
        type: 'string',
        title: 'Skipperblogs API Key',
        description: 'Enable Signal K tracking on https://www.skipperblogs.com/dashboard/nav/tracking to retrieve your key.',
      },
      checkIntervalMinutes: {
        type: 'number',
        title: 'Update interval (minutes)',
        description: 'Number of minutes the system record the position and tries to report it to Skipperblogs. (minimum 30min.)',
        minimum: 30,
        default: 60
      },
      maxQueueSize: {
        type: 'number',
        title: 'Max. number of cached positions while offline',
        description:
          'If the internet connection is interrupted for a long time, positions that could not be sent are cached and resent once the connection returns. The oldest cached positions are dropped once this limit is reached.' +
            '3000 records corresponds to about 250Ko of data being transferred',
        default: 3000
      },
      /*   maxBatchSize: {
          type: 'number',
          title: 'Max. number of positions sent per batch API call',
          description:
            'When catching up on a large queue of cached positions, they are sent in batches of this size instead of all at once, to stay within the API\'s limits.',
          default: 100
        },
        retryDelaySeconds: {
          type: 'number',
          title: 'Delay between resending queued position batches (seconds)',
          description:
            'Pause between individual batch requests while catching up on queued positions after a connection outage, to avoid flooding the Skipperblogs API.',
          default: 5
        },
       cameraSnapshotUrl: {
          type: 'string',
          title: 'Camera snapshot URL (optional)',
          description:
            'HTTP(S) URL that returns a single JPEG snapshot from an onboard IP camera (e.g. http://192.168.1.50/snapshot.jpg). If set, a fresh snapshot is fetched and attached to every position that is actually sent. Leave empty to disable.'
        },
        cameraUsername: {
          type: 'string',
          title: 'Camera username (optional, for HTTP Basic Auth)'
        },
        cameraPassword: {
          type: 'string',
          title: 'Camera password (optional, for HTTP Basic Auth)'
        },
        cameraTimeoutSeconds: {
          type: 'number',
          title: 'Camera snapshot timeout (seconds)',
          description:
            'How long to wait for the camera to respond before sending the position without an image.',
          default: 10
        }*/
    }
  };

  plugin.uiSchema = {
    cameraPassword: {
      'ui:widget': 'password'
    }
  };

  return plugin;
};
