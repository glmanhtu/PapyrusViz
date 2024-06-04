# Papyrus Visualization

This is a simplified version of the original application for webview only.
For the full version, please checkout the main branch of this repository,

## Build release
```bash
npm install
npm run package:angular-app
```
The release distribution HTML code will be generated at `workspaces/angular-app/.dist/angular-app`

You probably need to put this release HTML code into a http webserver such as `nginx` or `tomcat`,

To start a simple webserver for testing, use the following command:
```bash
cd workspaces/angular-app/.dist/angular-app
python3 -m http.server
```