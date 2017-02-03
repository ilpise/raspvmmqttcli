
var config = require('config');
var seller = config.get('Membership.seller');
var vmid =  config.get('Membership.vmid');
var uid = seller +'/'+ vmid;
var broker = config.get('Broker.host');

// mqtt
var mqtt = require('mqtt')
var client  = mqtt.connect('mqtt://'+broker)

// TODO add configuration file with parameters
//  mqtt broker url
//  seller id
//  vending machine id

// node watch directory
var watch = require('node-watch');

// for read files
var fs = require('fs');

var topic;
// If the broker is down this function is fired when it is restored
client.on('connect', function () {
  // subscribe to the setup topic to change the configuration file
  topic = uid +'/setup';
  client.subscribe(topic)
  //client.publish('presence', 'Hello mqtt')
})

client.on('message', function (topic, message) {
  // message is Buffer
  console.log(topic);
  console.log(message.toString())
  var array = topic.split('/');
  var action = array[array.length-1];
  if (action == "setup"){
    fs.writeFile("./config/default.json", message.toString(), function(err) {
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
  // Never end the client
  // client.end()
})

// watch the exchange directory to deliver and supply
watch('./exchange', function(filename) {
  console.log(filename, ' changed.');
  fs.readFile(filename, 'utf8', function (err, data) {
   if (err) {
      return console.error(err);
   }
   console.log("Asynchronous read: " + data.toString());
   client.publish(uid+'/deliver', data.toString())
  });
});
