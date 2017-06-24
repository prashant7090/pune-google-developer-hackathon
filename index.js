/**
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

// [START import]
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp(functions.config().firebase);
// [END import]

// [START helloWorld]
/**
 * Cloud Function to be triggered by Pub/Sub that logs a message using the data published to the
 * topic.
 */
// [START trigger]
exports.helloPubSub = functions.pubsub.topic('topic-name').onPublish(event => {
// [END trigger]
  // [START readBase64]
  const pubSubMessage = event.data;
  // Decode the PubSub Message body.
  const messageBody = pubSubMessage.data ? Buffer.from(pubSubMessage.data, 'base64').toString() : null;
  // [END readBase64]
  // Print the message in the logs.
  console.log(`Hello ${messageBody || 'World'}!`);
});
// [END helloWorld]

/**
 * Cloud Function to be triggered by Pub/Sub that logs a message using the data published to the
 * topic as JSON.
 */
exports.helloPubSubJson = functions.pubsub.topic('another-topic-name').onPublish(event => {
  // [START readJson]
  const pubSubMessage = event.data;
  // Get the `name` attribute of the PubSub message JSON body.
  let name = null;
  try {
    name = pubSubMessage.json.name;
  } catch (e) {
    console.error('PubSub message was not JSON', e);
  }
  // [END readJson]
  // Print the message in the logs.
  console.log(`Hello ${name || 'World'}!`);
});

/**
 * Cloud Function to be triggered by Pub/Sub that logs a message using the data attributes
 * published to the topic.
 */
exports.helloPubSubAttributes = functions.pubsub.topic('yet-another-topic-name').onPublish(event => {
  // [START readAttributes]
  const pubSubMessage = event.data;
  // Get the `name` attribute of the message.
  const name = pubSubMessage.attributes.name;
  // [END readAttributes]
  // Print the message in the logs.
  console.log(`Hello ${name || 'World'}!`);
});

exports.addMessage = functions.https.onRequest((req, res) => {
  // Grab the text parameter.
  const original = req.query.text;
  // Push the new message into the Realtime Database using the Firebase Admin SDK.
  admin.database().ref('/messages').push({original: original}).then(snapshot => {
    // Redirect with 303 SEE OTHER to the URL of the pushed object in the Firebase console.
    res.redirect(303, snapshot.ref);
  });
});

exports.isOfficial = functions.https.onRequest((req, res) => {
  // Grab the text parameter.
  const uuid = req.query.uuid;
  // Push the new message into the Realtime Database using the Firebase Admin SDK.
  return admin.database().ref('/EmergencyContacts/Hospitals').once('value').then(snap => {
    if(snap.exists()) {
      console.log("Hospital data: ", snap.val());
      res.status(200).send(snap.val());
    } else {
      res.end();
    }
  });
});

function toRad(Value) {
  return Value * Math.PI / 180;
}

function calculateDistanceBetween(lat1, lon1, lat2, lon2) {
  //Radius of the earth in:  1.609344 miles,  6371 km  | var R = (6371 / 1.609344);
  var R = 3958.7558657440545; // Radius of earth in Miles
  var dLat = toRad(lat2-lat1);
  var dLon = toRad(lon2-lon1);
  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  var d = R * c;
  return d;
}

function getNearByEmergencyData(nearByLocations, startLat, startLong) {
  let nearByLocation = [];
  for (let i = 0; i < nearByLocations.length; i++) {
    let hospital = nearByLocations[i];
    let endLat = hospital.location.lat;
    let endLong = hospital.location.lng;
    nearByLocation[i] = calculateDistanceBetween(startLat, startLong, endLat, endLong);
  }
  let index = 0;
  if (nearByLocation) {
    let min = nearByLocation[0];
    for (let i = 1; i < nearByLocation.length; i++) {
      if (nearByLocation[i] < min) {
        min = nearByLocation[i];
        index = i;
      }
    }
  }
  return nearByLocations[index];
}

exports.getNearByHospital = functions.https.onRequest((req, res) => {
  // Grab the text parameter.
  const startLat = req.query.lat;
  const startLong = req.query.lng;
  // Push the new message into the Realtime Database using the Firebase Admin SDK.
  return admin.database().ref('/EmergencyContacts/Hospitals').once('value').then(snap => {
    if(snap.exists()) {
      let nearByHospital = getNearByEmergencyData(snap.val(), startLat, startLong);
      if (nearByHospital) {
        res.status(200).send(nearByHospital);
      } else {
        res.end();
      }
    } else {
      res.end();
    }
  });
});