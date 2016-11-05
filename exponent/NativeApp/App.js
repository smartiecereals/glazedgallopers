import React from 'react';
import Exponent from 'exponent';
import MapLink from './MapLink.js';
import styles from '../styles.js';
import AutoComplete from './AutoCompleteInputGoogle.js'
import AirCrimeMap from './AirCrimeMap.js';
import { PROVIDER_DEFAULT } from 'react-native-maps';
import axios from 'axios';
import API_KEY from '../keys.js';
import {
  View,
  Text,
  TextInput,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  Image
} from 'react-native';



class App extends React.Component {
  constructor () {
    super ();
    this.state = {
      currLocation: {
        lat: 37.764719,
        lng: -122.398289
      },
      currAddress: null,
      inputView: 'current',
      googleMapsUrl: 'https://www.google.com/',
      showCrime: false
    };

    this.handleUserInput = this.handleUserInput.bind(this);
    this.getSafestRoute = this.getSafestRoute.bind(this);
    this.getAddress = this.getAddress.bind(this);
    this.getInputView = this.getInputView.bind(this)
    this.destinationIsSync = this.destinationIsSync.bind(this);
    this.setDestinationSync = this.setDestinationSync.bind(this);
    this.originIsSync = this.originIsSync.bind(this);
    this.setOriginSync = this.setOriginSync.bind(this);
    this.getCrimeStats = this.getCrimeStats.bind(this);
    this.toggleCrime = this.toggleCrime.bind(this);
  }

  componentDidMount() {
    this.getAddress('currLocation');
    this.alertIfLocationsDisabledAsync();
    this.getLocationPermissionsAsync();
  }
  destinationIsSync() { return this.state.destinationIsSync }
  setDestinationSync(bool) { this.setState({destinationIsSync: bool}) }
  originIsSync() { return this.state.originIsSync }
  setOriginSync(bool) { this.setState({originIsSync: bool}) }
  toggleCrime () { this.setState({ showCrime: !this.state.showCrime })}

  handleUserInput (type) {
    return function(text, coords) {
      if(type === 'current') {
        this.setState({currAddress: text, currLocation: coords, inputView: 'destination', originIsSync: false});
      }
      if(type === 'destination') {
        this.setState({destAddress: text, destLocation: coords, destinationIsSync: false});
      }
    }.bind(this);
  }

  async getLocationPermissionsAsync() {
    const { Location, Permissions } = Exponent;
    const { status } = await Permissions.askAsync(Permissions.LOCATION);
    console.log(status);
    if (status === 'granted') {
      console.log('LOCATION GOT')
      return this.setCurrLocation();
      this.setOriginSync(false);

    } else {
      console.log('in error');
      console.log('LOCATION NOT GOT')

      throw new Error('Location permission not granted');
    }
  }

  async alertIfLocationsDisabledAsync() {
    const { Permissions } = Exponent;
    const { status } = await Permissions.getAsync(Permissions.LOCATION);
    if (status !== 'granted') {
      alert('Hey! You might want to enable locations for my app, they are useful.');
    }
  }

  setCurrLocation() {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        var initialPosition = {}
        initialPosition.lat = position.coords.latitude;
        initialPosition.lng = position.coords.longitude;
        console.log(initialPosition, 'position in setCurr');
        this.setState({
          currLocation: initialPosition, 
          defaultCurrLoc: {
              description: 'Home', 
                geometry: { 
                  location: initialPosition 
              }
            },
            inputView: 'destination'
          });
      },
      (error) => alert(JSON.stringify(error)),
    );
  }

  getCrimeStats () {
    let context = this
    let getUrl = 'http://138.68.62.73:3000/testDanger?';
    axios.get(getUrl, {
        params: {
          long: this.state.currLocation.lng,
          lat: this.state.currLocation.lat,
          radius: 0.01
        }
      })
      .then(function(res) {
        let crimeData = res.data.map(function(dataPoint) {
          return { longitude: dataPoint[0], latitude: dataPoint[1] }
        })
        context.setState({ crimeData: crimeData, originIsSync: true })
    })
  }

  getSafestRoute() {
    let originCoords = this.state.currLocation;
    let destinationCoords = this.state.destLocation;
    let context = this;
    let locationURL = 'http://138.68.62.73:3000/safestRoute?'

    axios.get(locationURL, {
        params: {
          originLat: originCoords.lat,
          originLon: originCoords.lng,
          destLat: destinationCoords.lat,
          destLon: destinationCoords.lng
        }
      })
      .then(function(jsonRoute) {
        let wayPointData = jsonRoute.data.waypoints;
        console.log('WAYPOINT DATA', wayPointData)
        wayPointData = wayPointData.map(function(waypoint) {
          let newWP = { latitude: waypoint.lat , longitude: waypoint.lng };
          return newWP;
        })
        context.setState({
          safeRoute: wayPointData,
          googleMapsUrl: jsonRoute.data.url,
          destinationIsSync: true
        });
      }).catch(function(err) {
        console.log('ERROR :', err)
      })
    }



  getAddress (currOrDest) {
    const context = this;
    let url ='https://maps.googleapis.com/maps/api/geocode/json?latlng=';
    let currLocation = this.state[ currOrDest ];
    let coords = currLocation.lat.toString() +','+ currLocation.lng.toString();
    let key = '&key=' + API_KEY;
    let getUrl = url+coords+key;
    axios.get(getUrl).then(function(geoLocation) {
      formattedAddress = geoLocation.data.results[1].formatted_address;
      context.setState({ currAddress: formattedAddress })
    });
  }



  renderCurrAddressButton(key, fnOnPress, text) {
    return (
      <View style={ styles.UserInput }>
      <TouchableOpacity
        key={ key }
        style={ styles.UserInputCurrAddress }
        onPress={ fnOnPress  }
      >
        <Text style={{ color:'#FFF', fontSize: 15 }}>{text}</Text>
        <Image 
        style={ styles.UserInputCurrAddressIcon }
        source={ require('../assets/images/pencil_96.png') }/>
      </TouchableOpacity>
      </View>

    );
  }

  getInputView() {
    const { 
      inputView,
      DefaultCurrentLocation,
      currAddress,
      currLocation } = this.state;
    const {
      handleUserInput,
      setDestinationSync } = this;


    if(inputView === 'current') {
      return (
        <View style={styles.UserInput}>
        <AutoComplete 
          handleUserInput={handleUserInput('current')}
          placeHolder={'Enter Your Current Location'}
          currentAddress = {currAddress}
          currLocation={currLocation}
          />
        </View>
      );
    } 

    if(inputView === 'destination' && currAddress) {
      console.log('INPUT VIEW DESTINATION')
      let currAddressShorten = currAddress.split(',')[0] || currAddress;
      let setCurrView = () => {this.setState({inputView: 'current'})}

      return (
        <View>
        {
          this.renderCurrAddressButton(
          'currAddress',
          setCurrView,
          `Current Location: ${currAddressShorten}`)
        }
        <AutoComplete 
          handleUserInput={handleUserInput('destination')}
          placeHolder={'Enter Your Destination'}
          currLocation={currLocation}
          />
        </View>
      );
    }
  }

  render() {

    const {destLocation, currLocation, safeRoute, crimeData, googleMapsUrl, showCrime} = this.state;
    const {getSafestRoute, destinationIsSync, originIsSync, getCrimeStats, toggleCrime} = this;
    return (
      <View style={styles.container}>
        <StatusBar
          backgroundColor="#27a1ab"
          barStyle="default"
        />
        <MapLink
        style={styles.mapLink}
        toggleCrime={toggleCrime}
        googleMapsUrl={googleMapsUrl} >
        </MapLink>
        <View>
          {this.getInputView()}
        </View>
        <View style={styles.map}>
          <AirCrimeMap
          showCrime={showCrime}
          destinationIsSync={destinationIsSync}
          originIsSync={originIsSync}
          safeRoute={safeRoute} 
          getSafestRoute={getSafestRoute} 
          getCrimeStats={getCrimeStats}
          provider={PROVIDER_DEFAULT} 
          destLocation={destLocation} 
          currLocation={currLocation} 
          crimeData={crimeData} />
        </View>
      </View>
      );
  }
}
export default App
