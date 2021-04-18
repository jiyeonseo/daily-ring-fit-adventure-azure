const Twitter = require("twitter");
const dayjs = require("dayjs");
const ComputerVision = require('./ocr/azure')

var client = new Twitter({
  consumer_key: process.env["TWT_CONSUMER_KEY"],
  consumer_secret: process.env["TWT_CONSUMER_SECRET"],
  access_token_key: "",
  access_token_secret: "",
});

async function getTwit() {
  return new Promise((resolve) => {
    var params = {
      screen_name: process.env["TWT_NAME"],
      count: 300,
      trim_user: true,
      exclude_replies: true,
      include_rts: false,
    };
    return client.get(
      "statuses/user_timeline",
      params,
      function (error, tweets) {
        if (!error) {
          resolve(tweets);
        }
      }
    );
  });
}

module.exports = async function (context, req) {
  const tweets = await getTwit();

  const todays = tweets.filter((twt) => {
    if (twt.text.includes("#RingFitAdventure")) {
      var created_at = dayjs(twt.created_at);
      var today = dayjs()
      if (today.isSame(created_at, "day")) {
        return true;
      }
    }
    return false;
  });

  if (todays.length == 0) return;

  const data = await ComputerVision.run(todays[0])
  
  context.bindings.outputDocument = {
    date : data.date,
    time : data.time,
    cal : data.cal,
    distance: data.distance
  }
};
