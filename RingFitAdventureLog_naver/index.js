const Twitter = require("twitter");
const dayjs = require("dayjs");
const axios = require("axios");

const naver_ocr_url = process.env["NAVER_OCR_URL"];
const naver_ocr_secret_key = process.env["NAVER_OCR_SECRET_KEY"]; 

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
async function getExcerciseLog(twt) {
  var today = dayjs();
  return new Promise((resolve) => {
    var created_at = dayjs(twt.created_at);
    var result_img = twt.entities.media[0].media_url;
    const headers = {
      "Content-Type": "application/json",
      "X-OCR-SECRET": naver_ocr_secret_key,
    };
    const form = {
      images: [
        {
          format: "jpg",
          name: "demo",
          url: result_img,
        },
      ],
      requestId: today.millisecond().toString() + "RFA",
      version: "V2",
      timestamp: today.millisecond().toString(),
    };
    try {
      axios({
        method: "POST",
        headers: headers,
        data: form,
        url: naver_ocr_url,
      }).then((response) => {
        const data = response.data;

        if (data.images[0].inferResult == "SUCCESS") {
          var time = "";
          var cal = "";
          var distance = "";

          data.images[0].fields.forEach((field) => {
            if (field.name == "time") {
              time = field.inferText.replace(/\s/gi, "");
              if (time.includes("min")) {
                // 영문 파싱 이상
                time =
                  time.substring(0, 2) + "분 " + time.substring(3, 5) + "초";
              }
            } else if (field.name == "kal") {
              cal = field.inferText;
              if (cal.includes("Cal")) {
                // 영문 파싱 이상
                cal.replace("Cal", "kcal");
              }
            } else if (field.name == "distance") {
              distance = field.inferText;
            }
          });
          
          resolve({
            date: created_at.add(9, "hour").format("YYYY-MM-DD") ,
            time:  (parseInt(time.substring(0, 2)) * 60 + parseInt(time.substring(3, 5))), 
            cal: cal.trim().slice(0, -4) ,
            distance: distance.trim().slice(0, -2) 
          });
        }
      });
    } catch (err) {
      console.log("err", err);
    }
  });
}

module.exports = async function (context, req) {
  const tweets = await getTwit();

  const todays = tweets.filter((twt) => {
    if (twt.text.includes("#RingFitAdventure")) {
      var created_at = dayjs(twt.created_at);
      var today = dayjs().subtract(5, "day");

      if (today.isSame(created_at, "day")) {
        return true;
      }
    }
    return false;
  });

  if (todays.length == 0) return;
  const data = await getExcerciseLog(todays[0]);
  
  context.bindings.ringFitLogDocument = {
    date : data.date,
    time : data.time,
    cal : data.cal,
    distance: data.distance
  }
};
