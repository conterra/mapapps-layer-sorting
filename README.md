[![devnet-bundle-snapshot](https://github.com/conterra/mapapps-layer-sorting/actions/workflows/devnet-bundle-snapshot.yml/badge.svg)](https://github.com/conterra/mapapps-layer-sorting/actions/workflows/devnet-bundle-snapshot.yml)
![Static Badge](https://img.shields.io/badge/tested_for_map.apps-4.19.3-%20?labelColor=%233E464F&color=%232FC050)
# Layer Sorting
The Layer Sorting Bundle allows you to manage the contents included in multiple domain bundles, creating a focused, app-based subset of contents.

![Screenshot App](https://github.com/conterra/mapapps-layer-sorting/blob/main/screenshot.png)

## Sample App
https://demos.conterra.de/mapapps/resources/apps/public_demo_layersorting/index.html

## Installation Guide

[dn_layersorting Documentation](https://github.com/conterra/mapapps-layer-sorting/tree/main/src/main/js/bundles/dn_layersorting)

## Quick start

Clone this project and ensure that you have all required dependencies installed correctly (see [Documentation](https://docs.conterra.de/en/mapapps/latest/developersguide/getting-started/set-up-development-environment.html)).

Then run the following commands from the project root directory to start a local development server:

```bash
# install all required node modules
$ mvn initialize

# start dev server
$ mvn compile -Denv=dev -Pinclude-mapapps-deps

# run unit tests
$ mvn test -P run-js-tests,include-mapapps-deps
```
