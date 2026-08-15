## Skipperblog Position Tracker (Signal K Plugin)
Created by Ralph Schnarkowski with the help of Claude AI on 30.07.2026
(English, French, German, Italian and Spanish text below)

### What does the plugin do?
- Checks the SignalK data object for the current GPS-position (`navigation.position`) at a configurable time interval (e.g., every 30 minutes) and sends it to the Skipperblogs tracking API — regardless of whether the vessel has moved.
- The check/send interval is configurable via the Signal K Admin UI.
- The API key is configurable via the Signal K Admin UI.
- The plugin additionally reads `navigation.speedOverGround` (in m/s, as expected by the API) and `navigation.courseOverGroundTrue` (converted from radians to degrees) from Signal K and includes them with the position, if available.
- Optionally, a snapshot from an onboard IP camera can be attached to every position that is sent (configurable camera URL, optional HTTP Basic Auth username/password, timeout). Large images are automatically downscaled before sending. If the camera cannot be reached, the position is still sent, just without an image.
- Positions are sent via the Skipperblogs batch API, so multiple positions can be transmitted in a single API call.
- In case a position can not be transmitted due to missing internet connection it will be cached and sent as soon as the internet connection gets re-established. To not flood the Skipperblogs servers with too many API calls at the same time, e.g. when lots of positions have been cached due to long periods of internet outage, cached positions are resent in batches (of a configurable maximum size) with a configurable pause in between batches. The cached positions are sent with their original timestamp and in the sequence they got cached (FIFO). Each batch is either accepted or rejected as a whole by the API — there is no partial success within a batch.


#### Installation on the SignalK server (e.g., a Cerbo GX with Venus OS (and SignalK enabled), or another Linux server running SignalK)

### Short version (for techies)
1. Create a folder called `signalk-skipperblog-tracker` in SignalK's plugin directory (`node_modules`).
2. Copy the plugin files (README.md, package.json, and index.js) into the `signalk-skipperblog-tracker` folder.
3. Install the `jimp` npm dependency (used to downscale camera images): run `npm install jimp --save` inside the `signalk-skipperblog-tracker` folder.
4. Restart SignalK (e.g., via the SignalK admin web interface).
5. Configure the Skipperblog Position Tracker plugin in the SignalK admin web interface.
6. Check whether the position reports are arriving on your Skipperblogs page (e.g., via **Navigation → Tracking → AIS → Data**, or on the Skipperblogs tracking map view).

### More detailed version for not-so-techies:
1. Get access to the SignalK server, for example by establishing an SSH connection to the SignalK server (e.g., using the Putty software).

2. Find out which directory on your server the Signal K software is installed in.
On a Linux system, you can do this with the command `ps -w | grep -i signalk`
You should get output similar to the following:
```
root@CerboWLAN:/# ps -w | grep -i signalk
  819 root      1844 S    supervise signalk-server
 1891 root      1988 S    multilog t s25000 n4 /var/log/signalk-server
 2549 signalk   285m S    node /usr/lib/node_modules/signalk-server/bin/signalk-server -c /data/conf/signalk
12336 root      2788 S    grep -i signalk
```
In the second-to-last line, on the far right, you'll see the path — in this case: **/data/conf/signalk**

3. The plugins are located in the `node_modules` subfolder of this path. Create a new folder `signalk-skipperblog-tracker` inside it.
For example, use the Linux command:
`mkdir /data/conf/signalk/node_modules/signalk-skipperblog-tracker` (it's important that the new directory is created underneath the `node_modules` folder!)

4. Copy the plugin files (README.md, package.json, and index.js) into this new directory, for example using WinSCP (if you're accessing the Linux SignalK server from a Windows PC).

5. This plugin depends on the `jimp` npm package (used to downscale camera images). If it is not already installed, connect via SSH and run `npm install jimp --save` inside the `signalk-skipperblog-tracker` folder.

6. Now restart SignalK via the SignalK admin web interface.
After the restart, "Skipperblog Position Tracker" should appear in the Signal K admin web interface under **Server → Plugin Config**.

7. Configure the Skipperblog Position Tracker plugin in the SignalK admin web interface.
**Server → Plugin Config → Skipperblog Position Tracker**. Enter the values for the various parameters here. You can get your personal API key on the Skipperblogs website under **Navigation → Tracking → AIS → Settings**.
Then enable the plugin using the "Enabled" switch.

Reasonable suggested values for the parameters are, for example:
Check interval (minutes): 30
Max. number of queued positions while offline: 500
Max. number of positions sent per batch API call: 100
Delay between resending queued position batches (seconds): 5
Camera snapshot URL: leave empty to disable
Camera snapshot timeout (seconds): 10

8. Check whether the position reports are now arriving on your Skipperblogs page, e.g., in **Navigation → Tracking → AIS → Data**, or on the Skipperblogs tracking map view.

---

## Skipperblog Position Tracker (Plugin Signal K)
Créé par Ralph Schnarkowski avec l'aide de Claude AI le 30.07.2026

### Que fait le plugin ?
- Vérifie l'objet de données SignalK pour la position actuelle (`navigation.position`) à intervalle de temps configurable (par ex. toutes les 30 minutes) et l'envoie à l'API de suivi Skipperblogs — que le bateau se soit déplacé ou non.
- L'intervalle de vérification/envoi est configurable via l'interface d'administration de Signal K.
- La clé API est configurable via l'interface d'administration de Signal K.
- Le plugin lit également `navigation.speedOverGround` (en m/s, comme attendu par l'API) et `navigation.courseOverGroundTrue` (converti de radians en degrés) depuis Signal K et les inclut avec la position, si disponibles.
- En option, une capture d'image provenant d'une caméra IP embarquée peut être jointe à chaque position envoyée (URL de caméra configurable, nom d'utilisateur/mot de passe optionnels pour l'authentification HTTP Basic, délai d'expiration). Les images volumineuses sont automatiquement redimensionnées avant l'envoi. Si la caméra n'est pas joignable, la position est tout de même envoyée, simplement sans image.
- Les positions sont envoyées via l'API batch de Skipperblogs, ce qui permet de transmettre plusieurs positions en un seul appel API.
- Si une position ne peut pas être transmise en raison d'une absence de connexion Internet, elle sera mise en cache et envoyée dès que la connexion sera rétablie. Afin de ne pas saturer les serveurs de Skipperblogs par un trop grand nombre d'appels API simultanés — par exemple lorsqu'un grand nombre de positions ont été mises en cache suite à une interruption prolongée de la connexion —, les positions en cache sont renvoyées par lots (d'une taille maximale configurable) avec une pause configurable entre les lots. Les positions mises en cache sont transmises avec leur horodatage d'origine et dans l'ordre de leur mise en cache (FIFO). Chaque lot est accepté ou rejeté dans son intégralité par l'API — il n'y a pas de succès partiel au sein d'un lot.


#### Installation sur le serveur SignalK (par ex. un Cerbo GX avec Venus OS (et SignalK activé), ou un autre serveur Linux exécutant SignalK)

### Version courte (pour les technophiles)
1. Créez un dossier `signalk-skipperblog-tracker` dans le répertoire des plugins de SignalK (`node_modules`).
2. Copiez les fichiers du plugin (README.md, package.json et index.js) dans le dossier `signalk-skipperblog-tracker`.
3. Installez la dépendance npm `jimp` (utilisée pour redimensionner les images de la caméra) : exécutez `npm install jimp --save` dans le dossier `signalk-skipperblog-tracker`.
4. Redémarrez SignalK (par ex. via l'interface web d'administration de SignalK).
5. Configurez le plugin Skipperblog Position Tracker dans l'interface web d'administration de SignalK.
6. Vérifiez que les rapports de position arrivent bien sur votre page Skipperblogs (par ex. via **Navigation → Tracking → AIS → Data**, ou sur la vue cartographique de suivi de Skipperblogs).

### Version détaillée pour les moins technophiles :
1. Accédez au serveur SignalK, par exemple en établissant une connexion SSH au serveur SignalK (par ex. avec le logiciel Putty).

2. Déterminez dans quel répertoire de votre serveur le logiciel Signal K est installé.
Sur un système Linux, cela peut se faire par exemple avec la commande `ps -w | grep -i signalk`
Vous devriez obtenir une sortie semblable à celle-ci :
```
root@CerboWLAN:/# ps -w | grep -i signalk
  819 root      1844 S    supervise signalk-server
 1891 root      1988 S    multilog t s25000 n4 /var/log/signalk-server
 2549 signalk   285m S    node /usr/lib/node_modules/signalk-server/bin/signalk-server -c /data/conf/signalk
12336 root      2788 S    grep -i signalk
```
Sur l'avant-dernière ligne, tout à droite, vous voyez le chemin, dans ce cas : **/data/conf/signalk**

3. Les plugins se trouvent dans le sous-dossier `node_modules` de ce chemin ; créez-y un nouveau dossier `signalk-skipperblog-tracker`.
Utilisez par exemple la commande Linux suivante :
`mkdir /data/conf/signalk/node_modules/signalk-skipperblog-tracker` (il est important que le nouveau répertoire soit créé sous le dossier `node_modules` !)

4. Copiez les fichiers du plugin (README.md, package.json et index.js) dans ce nouveau répertoire, par exemple avec le logiciel WinSCP (si vous accédez au serveur SignalK Linux depuis un PC Windows).

5. Ce plugin dépend du paquet npm `jimp` (utilisé pour redimensionner les images de la caméra). S'il n'est pas déjà installé, connectez-vous en SSH et exécutez `npm install jimp --save` dans le dossier `signalk-skipperblog-tracker`.

6. Redémarrez maintenant SignalK via l'interface web d'administration de SignalK.
Après le redémarrage, « Skipperblog Position Tracker » devrait apparaître dans l'interface web d'administration de Signal K sous **Server → Plugin Config**.

7. Configurez le plugin Skipperblog Position Tracker dans l'interface web d'administration de SignalK.
**Server → Plugin Config → Skipperblog Position Tracker**. Saisissez ici les valeurs des différents paramètres. Vous obtiendrez votre clé API personnelle sur le site Skipperblogs sous **Navigation → Tracking → AIS → Settings**.
Activez ensuite le plugin à l'aide de l'interrupteur « Enabled ».

Des valeurs proposées raisonnables pour les paramètres sont par exemple :
Check interval (minutes) : 30
Max. number of queued positions while offline : 500
Max. number of positions sent per batch API call : 100
Delay between resending queued position batches (seconds) : 5
Camera snapshot URL : laisser vide pour désactiver
Camera snapshot timeout (seconds) : 10

8. Vérifiez que les rapports de position arrivent maintenant bien sur votre page Skipperblogs, par ex. dans **Navigation → Tracking → AIS → Data**, ou sur la vue cartographique de suivi de Skipperblogs.

---

# Skipperblog Position Tracker (Signal K Plugin)
Erstellt von Ralph Schnarkowski mit Hilfe von Claude-AI am 30.07.2026

## Was macht das Plugin?
- Prüft in einem konfigurierbaren Zeitintervall (bspw. alle 30 Minuten) das SignalK-Datenobjekt für die aktuelle Position (`navigation.position`) und sendet sie an die Skipperblogs-Tracking-API — unabhängig davon, ob sich das Boot bewegt hat oder nicht.
- Das Prüf-/Sendeintervall ist über die Signal-K-Admin-UI konfigurierbar.
- Der API-Key ist über die Signal-K-Admin-UI konfigurierbar.
- Das Plugin liest zusätzlich `navigation.speedOverGround` (in m/s, so wie von der API erwartet) und `navigation.courseOverGroundTrue` (Radiant → Grad umgerechnet) aus Signal K und übermittelt sie zusammen mit der Position, sofern verfügbar.
- Optional kann ein Schnappschuss einer bordeigenen IP-Kamera an jede gesendete Position angehängt werden (konfigurierbare Kamera-URL, optionaler Benutzername/Passwort für HTTP Basic Auth, Timeout). Große Bilder werden vor dem Senden automatisch verkleinert. Ist die Kamera nicht erreichbar, wird die Position trotzdem gesendet, nur eben ohne Bild.
- Positionen werden über die Skipperblogs-Batch-API gesendet, wodurch mehrere Positionen in einem einzigen API-Aufruf übertragen werden können.
- Kann eine Position aufgrund einer fehlenden Internetverbindung nicht übertragen werden, wird sie zwischengespeichert und versendet, sobald die Verbindung wiederhergestellt ist. Um die Skipperblogs-Server nicht mit zu vielen gleichzeitigen API-Aufrufen zu überlasten – etwa wenn infolge eines längeren Internetausfalls eine große Anzahl von Positionen zwischengespeichert wurde –, werden zwischengespeicherte Positionen in Blöcken (mit konfigurierbarer maximaler Größe) und mit einer konfigurierbaren Pause zwischen den Blöcken erneut gesendet. Die zwischengespeicherten Positionen werden mit ihrem ursprünglichen Zeitstempel und in der Reihenfolge ihrer Zwischenspeicherung (FIFO) übertragen. Jeder Block wird von der API entweder vollständig angenommen oder vollständig abgelehnt – ein Teilerfolg innerhalb eines Blocks ist nicht vorgesehen.

### Installation auf dem SignalK-Server (bspw. einem Cerbo GX mit Venus-OS (und aktiviertem SignalK) oder einem anderen Linux-Server mit SignalK)

## Kurzfassung (für Techies)
1. Lege im Plugin-Verzeichnis von SignalK (node_modules) einen Ordner signalk-skipperblog-tracker an.
2. Kopiere die Dateien des Plugin (README.md package.json und index.js) in den Ordner signalk-skipperblog-tracker
3. Installiere die npm-Abhängigkeit `jimp` (wird zum Verkleinern von Kamerabildern verwendet): führe `npm install jimp --save` im Ordner signalk-skipperblog-tracker aus.
4. Starte SignalK neu (bspw. auf der Admin-Weboerfläche von SignalK)
5. Konfiguriere das Plugin Skipperblog-Position-Tracker in der Admin-Weboberfläche von SignalK
6. Prüfe ob die Positionsmeldungen auf Deiner Skipperblogs-Seite ankommen (bspw. über **Navigation → Tracking → AIS → Data** oder auf der Skipperblogs-Tracking-Kartenansicht)

## Detailliertere Fassung für Not-So-Techies:
1. Verschaffe Dir Zugrif auf den SignalK-Server, stelle bspw. eine SSH-Verbindung zum SignalK-Server her (bspw. mit der Software Putty).

2. Finde heraus in welchem Verzeichnis auf Deinem Server die Signal-K Software installiert ist. 
Auf einem Linux-System geht das bspw. mit dem Befehl `ps -w | grep -i signalk`
Du solltest eine ähnliche Ausgabe wie die folgende erhalten:
root@CerboWLAN:/# ps -w | grep -i signalk
  819 root      1844 S    supervise signalk-server
 1891 root      1988 S    multilog t s25000 n4 /var/log/signalk-server
 2549 signalk   285m S    node /usr/lib/node_modules/signalk-server/bin/signalk-server -c /data/conf/signalk
12336 root      2788 S    grep -i signalk

In der vorletzten Zeile ganz rechts siehst Du den Pfad, in diesem Fall: **/data/conf/signalk**

3. In diesem Pfad befinden sich im Unterordner `node_modules` die Plugins, lege hierin einen neuen Ordner `signalk-skipperblog-tracker` an.
Verwende hierfür bspw. folgenden Linux-Befehl (wenn du in Schritt 2 einen anderen Pfad gefunden hast musst du Deinen gefundenen Pfad anstatt `/data/conf/signalk` verwenden!)
`mkdir /data/conf/signalk/node_modules/signalk-skipperblog-tracker` (wichtig ist, dass das neue Verzeichnis unterhalb des Ordners `node_modules` angelegt wird!)

4. Kopiere die Plugin-Dateien (README.md,  package.json und index.js) in dieses neue Verzeichnis, bspw. mit der Software WinSCP (so Du von einem Windows-PC auf den Linux-SignalK-Server zugreifst).

5. Dieses Plugin benötigt das npm-Paket `jimp` (wird zum Verkleinern von Kamerabildern verwendet). Falls es noch nicht installiert ist, verbinde Dich per SSH und führe im Ordner `signalk-skipperblog-tracker` den Befehl `npm install jimp --save` aus.

6. Starte nun SignalK neu über die Admin-Weboberfläche von SignalK
In der Signal-K-Admin-Weboberfläche unter **Server → Plugin Config** sollte nach dem Neustart jetzt "Skipperblog Position Tracker" auftauchen.

7. Konfiguriere das Plugin Skipperblog-Position-Tracker in der Admin-Weboberfläche von SignalK
**Server → Plugin Config → Skipperblog Position Tracker**. Gebe hier die Werte für die verschiedenen Parameter ein. Deinen persönlichen API-Key erhälts Du auf der Skipperblogs-Seite unter **Navigation → Tracking → AIS → Settings**
Aktiviere anschliessend das Plugin mit dem Schater "Enabled".

Sinnvolle Vorschlagswerte für die Parameter sind bspw.
Check interval (minutes): 30
Max. number of queued positions while offline: 500
Max. number of positions sent per batch API call: 100
Delay between resending queued position batches (seconds): 5
Camera snapshot URL: leer lassen, um das Feature zu deaktivieren
Camera snapshot timeout (seconds): 10


8. Prüfe ob die Positionsmeldungen nun auf Deiner Skipperblogs-Seite ankommen bspw. in **Navigation → Tracking → AIS → Data** oder auf der Skipperblogs-Tracking-Kartenansicht.


# Italiano

## Skipperblog Position Tracker (Plugin Signal K)
Creato da Ralph Schnarkowski con l'aiuto di Claude AI il 30.07.2026
(Testo in inglese, francese e tedesco più sotto)

### Cosa fa il plugin?
- Controlla l'oggetto dati di SignalK per la posizione attuale (`navigation.position`) a un intervallo di tempo configurabile (ad es. ogni 30 minuti) e la invia all'API di tracciamento Skipperblogs — indipendentemente dal fatto che l'imbarcazione si sia spostata o meno.
- L'intervallo di controllo/invio è configurabile tramite l'interfaccia di amministrazione di Signal K.
- La chiave API è configurabile tramite l'interfaccia di amministrazione di Signal K.
- Il plugin legge inoltre `navigation.speedOverGround` (in m/s, come previsto dall'API) e `navigation.courseOverGroundTrue` (convertito da radianti a gradi) da Signal K e li include insieme alla posizione, se disponibili.
- Facoltativamente, è possibile allegare uno scatto di una telecamera IP di bordo a ogni posizione inviata (URL della telecamera configurabile, nome utente/password opzionali per l'autenticazione HTTP Basic, timeout). Le immagini di grandi dimensioni vengono automaticamente ridimensionate prima dell'invio. Se la telecamera non è raggiungibile, la posizione viene comunque inviata, semplicemente senza immagine.
- Le posizioni vengono inviate tramite l'API batch di Skipperblogs, il che consente di trasmettere più posizioni in un'unica chiamata API.
- Nel caso in cui una posizione non possa essere trasmessa a causa di una connessione Internet mancante, verrà messa in cache e inviata non appena la connessione Internet verrà ristabilita. Per non sovraccaricare i server di Skipperblogs con troppe chiamate API contemporaneamente, ad esempio quando molte posizioni sono state messe in cache a causa di lunghi periodi di interruzione della connessione Internet, le posizioni in cache vengono reinviate in blocchi (di dimensione massima configurabile) con una pausa configurabile tra i blocchi. Le posizioni memorizzate nella cache vengono inviate con il loro timestamp originale e nell'ordine in cui sono state memorizzate (FIFO). Ogni blocco viene accettato o rifiutato interamente dall'API — non è previsto un successo parziale all'interno di un blocco.

#### Installazione sul server SignalK (ad es. un Cerbo GX con Venus OS (e SignalK abilitato), o un altro server Linux con SignalK)

### Versione breve (per esperti)
1. Crea una cartella chiamata `signalk-skipperblog-tracker` nella directory dei plugin di SignalK (`node_modules`).
2. Copia i file del plugin (README.md, package.json e index.js) nella cartella `signalk-skipperblog-tracker`.
3. Installa la dipendenza npm `jimp` (usata per ridimensionare le immagini della telecamera): esegui `npm install jimp --save` nella cartella `signalk-skipperblog-tracker`.
4. Riavvia SignalK (ad es. tramite l'interfaccia web di amministrazione di SignalK).
5. Configura il plugin Skipperblog Position Tracker nell'interfaccia web di amministrazione di SignalK.
6. Verifica che i rapporti di posizione arrivino sulla tua pagina Skipperblogs (ad es. tramite **Navigation → Tracking → AIS → Data**, oppure sulla vista mappa di tracciamento di Skipperblogs).

### Versione più dettagliata per i meno esperti:
1. Accedi al server SignalK, ad esempio stabilendo una connessione SSH al server SignalK (ad es. con il software Putty).

2. Scopri in quale directory del tuo server è installato il software Signal K.
Su un sistema Linux puoi farlo ad esempio con il comando `ps -w | grep -i signalk`
Dovresti ottenere un output simile al seguente:
```
root@CerboWLAN:/# ps -w | grep -i signalk
  819 root      1844 S    supervise signalk-server
 1891 root      1988 S    multilog t s25000 n4 /var/log/signalk-server
 2549 signalk   285m S    node /usr/lib/node_modules/signalk-server/bin/signalk-server -c /data/conf/signalk
12336 root      2788 S    grep -i signalk
```
Nella penultima riga, tutto a destra, vedrai il percorso — in questo caso: **/data/conf/signalk**

3. I plugin si trovano nella sottocartella `node_modules` di questo percorso. Crea al suo interno una nuova cartella `signalk-skipperblog-tracker`.
Usa ad esempio il comando Linux:
`mkdir /data/conf/signalk/node_modules/signalk-skipperblog-tracker` (è importante che la nuova directory venga creata all'interno della cartella `node_modules`!)

4. Copia i file del plugin (README.md, package.json e index.js) in questa nuova directory, ad esempio usando WinSCP (se accedi al server Linux SignalK da un PC Windows).

5. Questo plugin dipende dal pacchetto npm `jimp` (usato per ridimensionare le immagini della telecamera). Se non è già installato, connettiti via SSH ed esegui `npm install jimp --save` nella cartella `signalk-skipperblog-tracker`.

6. Ora riavvia SignalK tramite l'interfaccia web di amministrazione di SignalK.
Dopo il riavvio, "Skipperblog Position Tracker" dovrebbe apparire nell'interfaccia web di amministrazione di Signal K sotto **Server → Plugin Config**.

7. Configura il plugin Skipperblog Position Tracker nell'interfaccia web di amministrazione di SignalK.
**Server → Plugin Config → Skipperblog Position Tracker**. Inserisci qui i valori dei vari parametri. Puoi ottenere la tua chiave API personale sul sito Skipperblogs sotto **Navigation → Tracking → AIS → Settings**.
Quindi attiva il plugin usando l'interruttore "Enabled".

Valori suggeriti ragionevoli per i parametri sono, ad esempio:
Check interval (minutes): 30
Max. number of queued positions while offline: 500
Max. number of positions sent per batch API call: 100
Delay between resending queued position batches (seconds): 5
Camera snapshot URL: lascia vuoto per disabilitare
Camera snapshot timeout (seconds): 10

8. Verifica che i rapporti di posizione arrivino ora sulla tua pagina Skipperblogs, ad es. in **Navigation → Tracking → AIS → Data**, oppure sulla vista mappa di tracciamento di Skipperblogs.

---

# Español

## Skipperblog Position Tracker (Plugin de Signal K)
Creado por Ralph Schnarkowski con la ayuda de Claude AI el 30.07.2026
(Texto en inglés, francés y alemán más abajo)

### ¿Qué hace el plugin?
- Comprueba el objeto de datos de SignalK para la posición actual (`navigation.position`) a un intervalo de tiempo configurable (por ej., cada 30 minutos) y la envía a la API de seguimiento de Skipperblogs — independientemente de si el barco se ha movido o no.
- El intervalo de comprobación/envío es configurable a través de la interfaz de administración de Signal K.
- La clave API es configurable a través de la interfaz de administración de Signal K.
- El plugin además lee `navigation.speedOverGround` (en m/s, tal como lo espera la API) y `navigation.courseOverGroundTrue` (convertido de radianes a grados) desde Signal K, y los incluye junto con la posición, si están disponibles.
- Opcionalmente, se puede adjuntar una instantánea de una cámara IP a bordo a cada posición enviada (URL de cámara configurable, nombre de usuario/contraseña opcionales para autenticación HTTP Basic, tiempo de espera). Las imágenes grandes se reducen automáticamente antes del envío. Si no se puede acceder a la cámara, la posición se envía igualmente, simplemente sin imagen.
- Las posiciones se envían a través de la API batch de Skipperblogs, lo que permite transmitir varias posiciones en una sola llamada API.
- En caso de que una posición no pueda transmitirse debido a la falta de conexión a Internet, se almacenará en caché y se enviará en cuanto se restablezca la conexión a Internet. Para no saturar los servidores de Skipperblogs con demasiadas llamadas API al mismo tiempo, por ejemplo cuando se han almacenado muchas posiciones en caché debido a largos períodos sin conexión, las posiciones en caché se reenvían en lotes (de un tamaño máximo configurable) con una pausa configurable entre lotes. Las posiciones almacenadas en caché se envían con su marca de tiempo original y en el orden en que se almacenaron (FIFO). Cada lote es aceptado o rechazado en su totalidad por la API — no existe un éxito parcial dentro de un lote.

#### Instalación en el servidor SignalK (por ej., un Cerbo GX con Venus OS (y SignalK activado), u otro servidor Linux con SignalK)

### Versión corta (para técnicos)
1. Crea una carpeta llamada `signalk-skipperblog-tracker` en el directorio de plugins de SignalK (`node_modules`).
2. Copia los archivos del plugin (README.md, package.json e index.js) en la carpeta `signalk-skipperblog-tracker`.
3. Instala la dependencia npm `jimp` (usada para redimensionar las imágenes de la cámara): ejecuta `npm install jimp --save` dentro de la carpeta `signalk-skipperblog-tracker`.
4. Reinicia SignalK (por ej., a través de la interfaz web de administración de SignalK).
5. Configura el plugin Skipperblog Position Tracker en la interfaz web de administración de SignalK.
6. Comprueba si los informes de posición llegan a tu página de Skipperblogs (por ej., mediante **Navigation → Tracking → AIS → Data**, o en la vista de mapa de seguimiento de Skipperblogs).

### Versión más detallada para los menos técnicos:
1. Accede al servidor SignalK, por ejemplo estableciendo una conexión SSH con el servidor SignalK (por ej., con el software Putty).

2. Averigua en qué directorio de tu servidor está instalado el software Signal K.
En un sistema Linux, puedes hacerlo, por ejemplo, con el comando `ps -w | grep -i signalk`
Deberías obtener una salida similar a la siguiente:
```
root@CerboWLAN:/# ps -w | grep -i signalk
  819 root      1844 S    supervise signalk-server
 1891 root      1988 S    multilog t s25000 n4 /var/log/signalk-server
 2549 signalk   285m S    node /usr/lib/node_modules/signalk-server/bin/signalk-server -c /data/conf/signalk
12336 root      2788 S    grep -i signalk
```
En la penúltima línea, en el extremo derecho, verás la ruta — en este caso: **/data/conf/signalk**

3. Los plugins se encuentran en la subcarpeta `node_modules` de esta ruta. Crea dentro de ella una nueva carpeta `signalk-skipperblog-tracker`.
Usa, por ejemplo, el comando de Linux:
`mkdir /data/conf/signalk/node_modules/signalk-skipperblog-tracker` (¡es importante que el nuevo directorio se cree dentro de la carpeta `node_modules`!)

4. Copia los archivos del plugin (README.md, package.json e index.js) en este nuevo directorio, por ejemplo usando WinSCP (si accedes al servidor Linux SignalK desde un PC con Windows).

5. Este plugin depende del paquete npm `jimp` (usado para redimensionar las imágenes de la cámara). Si aún no está instalado, conéctate por SSH y ejecuta `npm install jimp --save` dentro de la carpeta `signalk-skipperblog-tracker`.

6. Ahora reinicia SignalK a través de la interfaz web de administración de SignalK.
Después del reinicio, "Skipperblog Position Tracker" debería aparecer en la interfaz web de administración de Signal K bajo **Server → Plugin Config**.

7. Configura el plugin Skipperblog Position Tracker en la interfaz web de administración de SignalK.
**Server → Plugin Config → Skipperblog Position Tracker**. Introduce aquí los valores de los distintos parámetros. Puedes obtener tu clave API personal en el sitio web de Skipperblogs bajo **Navigation → Tracking → AIS → Settings**.
Luego activa el plugin usando el interruptor "Enabled".

Valores sugeridos razonables para los parámetros son, por ejemplo:
Check interval (minutes): 30
Max. number of queued positions while offline: 500
Max. number of positions sent per batch API call: 100
Delay between resending queued position batches (seconds): 5
Camera snapshot URL: dejar vacío para desactivar
Camera snapshot timeout (seconds): 10

8. Comprueba si los informes de posición llegan ahora a tu página de Skipperblogs, por ej. en **Navigation → Tracking → AIS → Data**, o en la vista de mapa de seguimiento de Skipperblogs.
