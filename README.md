## Skipperblogs Position Tracker (Signal K Plugin)
Created by Ralph Schnarkowski with the help of Claude AI on 30.07.2026

### What does the plugin do?
- Checks the SignalK data object for the current GPS-position (`navigation.position`) at a configurable time interval (e.g., every 30 minutes) and sends it to the Skipperblogs tracking API — regardless of whether the vessel has moved.
- The check/send interval is configurable via the Signal K Admin UI.
- The API key is configurable via the Signal K Admin UI.
- The plugin additionally reads `navigation.speedOverGround` (in m/s, as expected by the API) and `navigation.courseOverGroundTrue` (converted from radians to degrees) from Signal K and includes them with the position, if available.
- Optionally, a snapshot from an onboard IP camera can be attached to every position that is sent (configurable camera URL, optional HTTP Basic Auth username/password, timeout). Large images are automatically downscaled before sending. If the camera cannot be reached, the position is still sent, just without an image.
- Positions are sent via the Skipperblogs batch API, so multiple positions can be transmitted in a single API call.
- In case a position can not be transmitted due to missing internet connection it will be cached and sent as soon as the internet connection gets re-established. To not flood the Skipperblogs servers with too many API calls at the same time, e.g. when lots of positions have been cached due to long periods of internet outage, cached positions are resent in batches (of a configurable maximum size) with a configurable pause in between batches. The cached positions are sent with their original timestamp and in the sequence they got cached (FIFO). Each batch is either accepted or rejected as a whole by the API — there is no partial success within a batch.


#### Installation on the SignalK server (e.g., a Cerbo GX with Venus OS (and SignalK enabled), or another Linux server running SignalK)

From the SignalK admin UI Appstore, search for signalk-mcp-container and install (requires the signalk-container plugin already installed and a container runtime — podman or docker — available on the host). Or:

npm install signalk-mcp-container

then restart the server and enable the plugin from Server → Plugin Config.



Requirements

    An internet connection is required in order to update noforeignland.com
    A navigation.position data path inside Signal K for self, which is your current GNSS position
    A noforeignland.com account
    Your Boat API Key from the noforeignland.com website:
        Account > Settings > Boat tracking > API Key

    Note your Boat API Key is not available in the app. You must sign in to the noforeignland.com website (using the same authentication method you use for the app: Google. Facebook, Email).



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