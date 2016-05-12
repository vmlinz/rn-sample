
import React, { AppRegistry } from 'react-native'
import BlogApp from './BlogApp'

import { createHistory } from 'history'

const histLib = createHistory();

const queryString = require('query-string');

let knownBrowserStack = null;

function setTitle(t) {
  document.title = t;
}

function getLastInArray(arr) {
  return arr[arr.length - 1];
}

const origHistoryLength = history.length;

class BrowserApp extends React.Component {
  constructor() {
    super();
    this.state = {
      navigation: undefined,
    };
  }

  componentDidMount() {
    this._unlistenHistory = histLib.listen(this._handleHistory.bind(this));
  }

  componentWillUnmount() {
    this._unlistenHistory();
  }

  _actionWithLocation(location) {
    return BlogApp.actionWithLocation({
      params: queryString.parse(location.search),
      path: location.pathname,
      key: location.state,
    });
  }

  _handleHistory(location) {
    if (!knownBrowserStack) {
      knownBrowserStack = [ location ];
      const action = this._actionWithLocation(location);
      this._handleAction(action);
      return;
    }

    if (this.cbOfNextHistoryEvent) {
      this.cbOfNextHistoryEvent();
      this.cbOfNextHistoryEvent = null;
      return;
    }

    console.log('Observed browser action. ', location.state);

    const foundActiveChild = this.state.navigation.children.find(c => c.key === location.state);
    if (foundActiveChild) {
      this._handleAction(BlogApp.Actions.jumpTo(location.state));
      return;
    }
    if (
      location.action === 'POP' &&
      history.length >= origHistoryLength
    ) {
      const action = this._actionWithLocation(location);
      this._handleAction(action);
      if (this._handleAction(BlogApp.Actions.back())) {
        return;
      }
    } else {
    }
  }

  _handleAction = (action) => {
    const nextAppProps = BlogApp.navigationReducer(this.state.navigation, action);
    if (nextAppProps !== this.state.navigation) {
      this.setState({
        navigation: nextAppProps,
      });
      return true;
    }
    return false;
  };

  replaceLocation({ path, params, key }, cb) {
    console.log('REPLACE ', key, path, params);
    this.cbOfNextHistoryEvent = cb;
    histLib.replace({
      pathname: path,
      search: params && '?' + queryString.stringify(params),
      state: key,
    });
  }

  pushLocation({ path, params, key }, cb) {
    console.log('PUSH ', key, path, params);
    this.cbOfNextHistoryEvent = cb;
    histLib.push({
      pathname: path,
      search: params && '?' + queryString.stringify(params),
      state: key,
    });
  }

  jumpLocation(dist, cb) {
    console.log('JUMP ', dist);
    this.cbOfNextHistoryEvent = cb;
    histLib.go(dist);
  }

  componentDidUpdate(lastProps, lastState) {
    const navigation = this.state.navigation;
    const lastNavState = lastState.navigation;
    const newLocation = BlogApp.locationWithState(navigation);
    const newActiveChild = navigation.children[navigation.index];
    const newTitle = BlogApp.getTitle(newActiveChild);
    const indexDelta = lastNavState && navigation.index - lastNavState.index;
    if (indexDelta > 0) {
      this.pushLocation(newLocation, () => {
        setTitle(newTitle);
      });
    } else if (indexDelta !== 0) {
      this.jumpLocation(indexDelta, () => {
        this.replaceLocation(newLocation, () => {
          setTitle(newTitle);
        });
      });
    } else {
      this.replaceLocation(newLocation, () => {
        setTitle(newTitle);
      });
    }
  }

  render() {
    if (!this.state.navigation) {
      return null;
    }
    return (
      <BlogApp
        onDispatch={this._handleAction}
        navigationState={this.state.navigation}
      />
    );
  }
}

AppRegistry.registerComponent('App', () => BrowserApp)

AppRegistry.runApplication(
  'App',
  {
    initialProps: {},
    rootTag: document.getElementById('react-app'),
  }
);