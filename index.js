import { AppRegistry } from 'react-native';
import { Buffer } from 'buffer';

global.Buffer = Buffer;

import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);