# Papyrus Visualization

Papyrus Visualization is an application designed for managing and processing images of papyrus fragments. Whether you're a researcher, historian, or enthusiast, this tool provides an intuitive interface and robust features to help you work with ancient papyrus documents.

<img width="1352" alt="Screenshot 2024-05-23 at 11 49 22" src="https://github.com/glmanhtu/PapyrusViz/assets/6909106/293e538e-dc88-4a70-a06b-1cb77a9bec6d">

## Features

-   **Manage Papyrus Fragment Images:** Easily add, organize, and view your collection of papyrus fragment images.
-   **Re-assemble Fragments:** Simplify your work to digitally piece together fragmented papyrus images, aiding in the reconstruction of historical documents.
-   **Export Reassembled Images:** Export your reassembled papyrus images in high-quality formats for further analysis or publication.
-   **Segment Papyrus:** Use deep learning techniques to segment papyrus fragments from the background, making it easier to focus on the text or drawings.
-   **User-friendly Interface:** Navigate through the application with ease, thanks to its clean and intuitive design.
-   **Cross-Platform Support:** Share and load your projects seamlessly across different platforms, allowing you to work on your papyrus projects anytime, anywhere.

## Installation
Mac users using ARM chipset:
```bash
curl -L https://github.com/glmanhtu/PapyrusViz/releases/download/v3.0.0/Papyviz-3.0.0-arm64.dmg -o ~/Downloads/Papyviz-3.0.0-arm64.dmg && open ~/Downloads/Papyviz-3.0.0-arm64.dmg
```

Mac users usings Intel chipset:
```bash
curl -L https://github.com/glmanhtu/PapyrusViz/releases/download/v3.0.0/Papyviz-3.0.0-x64.dmg -o ~/Downloads/Papyviz-3.0.0-x64.dmg && open ~/Downloads/Papyviz-3.0.0-x64.dmg
```
Distributed  .zip version can be dowloaded for Linux [here](https://github.com/glmanhtu/PapyrusViz/releases/download/v3.0.0/Papyviz-3.0.0-linux-x64.zip) and for Windows [here](https://github.com/glmanhtu/PapyrusViz/releases/download/v3.0.0/Papyviz-3.0.0-win32-x64.zip).


## For developers
### Setup development environment
Install application dependencies
```bash
npm install
```

Note: for Windows users, ensure that you have installed Nodejs with tools to compile native nodejs modules. See https://github.com/nodejs/node/issues/30242 for more information.

### Scripts
To start the application under development environment:
```bash
npm start
```

To package the application:
```bash
npm run package
```

To build release:
```bash
npm run make
```


## License
Licensed under the [GPLv3](https://github.com/glmanhtu/PapyrusViz/blob/main/LICENSE) license.
