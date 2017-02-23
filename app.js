
var config = require('config');
var mqtt = require('mqtt')
var fs = require('fs');

var broker = config.get('Broker.host');
var seller = config.get('Membership.seller');
var vmid =  config.get('Membership.vmid');

var client, uid;

if ( (seller == "") && (vmid == "") ) {
  var options = {}
  client  = mqtt.connect('ws://'+broker+':3000', options);
  client.on('connect', function (connack) {
    // console.log(connack);
    // fs : first start
    var topic = 'fs/' + Math.random().toString(16).substr(2, 8);
    // Just subscribe to the temporary topic
    client.subscribe(topic);
  });
  //
  client.on('message', function (topic, message) {
    console.log('------- client on message ---------');
    console.log('topic');
    console.log(topic);
    console.log('msg to string');
    console.log(message.toString());
    console.log('converting to obj');
    var obj = JSON.parse(message.toString('utf8'));

    if ( (obj.hasOwnProperty('action')) && (obj.action == "fsconf") ){
      console.log('--- test passed ---');
      console.log(obj);
      // - Reset the configuration file
      // - unsuscribe to the current setup topic
      // - subscribe to the new setup topic

      var jsonConf = {
        "Broker" : {
          "host" : obj.brokerhost
        },
        "Membership" : {
          "seller" : obj.seller,
          "vmid" : obj.vmid
        }
      }

      console.log(jsonConf);
      fs.writeFile("./config/default.json", JSON.stringify(jsonConf), function(err) {
        if(err) {
            return console.log(err);
        }
        console.log("The file was saved!");
        // unsubscribe to the old Membership
        client.unsubscribe(topic, function(err) {
          if(err) {
              return console.log(err);
          }
          console.log("client unsubscribed");
          // http://stackoverflow.com/questions/28974297/can-node-config-reload-configurations-without-restarting-node
          global.NODE_CONFIG = null;
          delete require.cache[require.resolve('config')];
          var config = require('config');
          console.log(config.get('Membership.seller'));
          console.log(config.get('Membership.vmid'));
          seller = config.get('Membership.seller');
          vmid =  config.get('Membership.vmid');
          uid = seller +'/'+ vmid;

          // subscribe to the new setup membership
          topic = uid +'/setup';
          client.subscribe(topic)

        });
      });
    }
  });

} else {
  var options = {
    clientId: vmid,
    clean: false,
  }
  uid = seller +'/'+ vmid;
  client  = mqtt.connect('ws://'+broker+':3000', options);
  client.on('connect', function (connack) {
    // subscribe to the setup membership
    // This client action will be parsed on the served side
    // if the vm NOT exist in the Drupal backend it will be created
    topic = uid +'/setup';
    client.subscribe(topic);
  });
}

console.log(broker);
// // watch the exchange directory to deliver and supply
watch('./exchange', function(filename) {
  console.log(filename, ' changed.');
  fs.readFile(filename, 'utf8', function (err, data) {
   if (err) {
      return console.error(err);
   }
   console.log("Asynchronous read: " + data.toString());
   // deliver -- consegnare -- distribuito
   client.publish(uid+'/deliver', data.toString())
   // supply -- rifornire -- carica
  //  client.publish(uid+'/supply', data.toString())
  });

});
