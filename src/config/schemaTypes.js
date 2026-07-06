const string = { type: String };
const arrayOfString = { type: [String] };
const number = { type: Number };
const boolean = { type: Boolean };
const date = { type: Date };
const object = { type: Object };
const arrayOfObject = { type: [Object] };
const arrayOfNumber = { type: [Number] };
const arrayOfDate = { type: [Date] };
const arrayOfBoolean = { type: [Boolean] };

const stringRequired = { type: String, required: true };
const arrayOfStringRequired = { type: [String], required: true };
const uniqueString = { type: String, unique: true };
const uniqueStringRequired = { type: String, unique: true, required: true };
const port = "https://demo.physicianhealthnet.com/api";

export {
  string,
  arrayOfString,
  number,
  boolean,
  date,
  object,
  arrayOfObject,
  arrayOfNumber,
  arrayOfDate,
  arrayOfBoolean,
  stringRequired,
  uniqueString,
  uniqueStringRequired,
  arrayOfStringRequired,
  port,
};
