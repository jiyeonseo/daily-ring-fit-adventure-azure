const ComputerVisionClient = require("@azure/cognitiveservices-computervision").ComputerVisionClient;
const ApiKeyCredentials = require("@azure/ms-rest-js").ApiKeyCredentials;
const sleep = require("util").promisify(setTimeout);

const {
  ComputerVisionMappers,
} = require("@azure/cognitiveservices-computervision");

const key = process.env["AZURE_VISION_KEY"];
const endpoint = process.env["AZURE_VISION_ENDPOINT"];

const STATUS_SUCCEEDED = "succeeded";
const STATUS_FAILED = "failed";

const dayjs = require("dayjs");
const core = require("@actions/core");
const axios = require("axios");

const ExercieseLog = require("../model/exerciselog");

class ComputerVision {

  async readTextFromURL(client, url) {
    let result = await client.read(url);
    let operation = result.operationLocation.split("/").slice(-1)[0];

    while (result.status !== STATUS_SUCCEEDED) {
      result = await client.getReadResult(operation);
      await sleep(1000);
    }

    return result.analyzeResult.readResults; // Return the first page of result. Replace [0] with the desired page if this is a multi-page file such as .pdf or .tiff.
  }

  async run(twt) {
    this.created_at = dayjs(twt.created_at);
    this.result_img = twt.entities.media[0].media_url;

    const computerVisionClient = new ComputerVisionClient(
      new ApiKeyCredentials({ inHeader: { "Ocp-Apim-Subscription-Key": key } }),
      endpoint
    );

    const printedResult = await this.readTextFromURL(
      computerVisionClient,
      this.result_img
    );
    
    return this._parse(printedResult);
  }

  _parse(printedResult) {
    let min = null;
    let sec = null;
    let cal = null;
    let distance = null;
    var reg = new RegExp("[0-9]+", "g");
    if (printedResult.length) {
      if (printedResult[0].lines.length) {
        for (let bb of printedResult[0].lines) {
          const text = bb.text.replace(/\s/gi, "");
          if (
            text.indexOf("min") > -1 ||
            text.indexOf("분") > -1 ||
            text.indexOf("=") > -1 // 이상하게 한글의 "분" 은 = 로 인식됨...
          ) {
            min = reg.exec(text);
            sec = reg.exec(text);
          } else if (text.indexOf("Cal") > -1 || text.indexOf("kcal") > -1) {
            cal = text;
            cal = cal.replace("Cal", "");
            cal = cal.replace("kcal", "");
          } else if (text.indexOf("km") > -1) {
            distance = text.replace("km", "");
          }
        }
      }
    }

    if (!min || !sec || !cal || !distance) {
      console.log("FAILED");
      core.setFailed(error.message);
    }
    
    return new ExercieseLog(
      this.created_at,
      this.result_img,
      min,
      sec,
      cal,
      distance
    );
  }
}

module.exports = new ComputerVision();
