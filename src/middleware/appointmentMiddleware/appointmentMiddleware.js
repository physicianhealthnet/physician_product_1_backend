export const appointmentMessage = async (req, res, next) => {
  try {
    console.log("data", req.body);
    const reqData = req.body;
    if (reqData.phoneNumber) {
      next();
    } else {
      console.log();
      next();
      return res.status(200).json({
        message: "Appointment Created without patient phone number",
      });
    }
    // next();
  } catch (error) {
    console.error(error);
  }
};
