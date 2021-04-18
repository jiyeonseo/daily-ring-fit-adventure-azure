module.exports = class ExercieseLog {
  constructor(created_at, img, min, sec, cal, distance) {
    this.date = created_at.add(9, "hour").format("YYYY-MM-DD");
    this.img = img;
    this.min = min;
    this.sec = sec;
    this.time = min * 60 + sec;
    this.cal = cal;
    this.distance = distance;
  }
};
