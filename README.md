## Skipperblogs tracking (Signal K Plugin)
Created by Ralph Schnarkowski with the help of Claude AI on 30.07.2026.\
Maintained by Skipperblogs.com

### What does this plugin do?

The plugin checks the SignalK data object for the current GPS-position (`navigation.position`) at a configurable time interval (e.g., every 30 minutes) and sends it to the Skipperblogs tracking API.

When the system isn't connected to the internet, the plugin caches the positions and sends them as a batch once the connectivity is restored (3 weeks of GPS points every 15 minutes is about 300 Ko.)

The plugin additionally reads `navigation.speedOverGround` (in m/s) and `navigation.courseOverGroundTrue` (converted from radians to degrees) from Signal K and includes them with the position when available.


### Requirement
- A partial internet connection
- A Skipperblogs.com account along with its API-key
- navigation.position data path inside Signal K

Alternatively, you can also enable other trackings that don't rely on internet (AIS, Iridium Go, Garmin Inreach, SPOT tracking, YB tracking) from your Skipperblogs.com account.


### Installation (easy way)

- Install from the Signak K AppStore
- Grab your API-key from https://www.skipperblogs.com/dashboard/nav/tracking#signalk
- Paste your key into this plugin configuration and enable it
- Optionally you can select at which interval it will collect your position

To check if the plugin is reporting the position correctly, open the page
https://www.skipperblogs.com/dashboard/nav/tracking#signalk and click on `Data` tab. This will show last reported positions by the plugin.


### Manual installation (for techies)


1. Create a folder called `@skipperblogs` in SignalK's plugin directory (`node_modules`).
2. In this folder, create a subfolder called `signalk-to-skipperblog-tracking`.
Copy all plugin files into this subfolder.
3. Execute the command `npm link` in the plugin folder (you might use sudo if the command fails)
4. Go to SignalK's root folder and execute `npm link signalk-to-skipperblog-tracking` (you might use sudo if the command fails)
Restart signalk-server
5. Grab your API-key from https://www.skipperblogs.com/dashboard/nav/tracking#signalk
6. Enable and configure the plugin in the SignalK admin web interface under Apps&Plugins > Configuration.

To check if the plugin is reporting the position correctly, open the page
https://www.skipperblogs.com/dashboard/nav/tracking#signalk and click on `Data` tab. This will show last reported positions by the plugin.


### Limitation
As Skipperblogs' live map is also designed for circumnavigators, it can't have the same level of detail as your chartplotter system.
Skipperblogs API will reject positions that are too close from each other in order to keep a reasonable map loading time for your visitors.
Minimum distance varies from 0.1 and 1 Nm depending of the situation.


