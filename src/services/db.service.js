export const createDBService = (model) => ({
  create: async (data) => await model.create(data),
  getAllData: async () => await model.find({ isDeleted: false }),
  getAll: async (filter = {}) =>
    await model.find({ ...filter, isDeleted: false }),
  getById: async (id) => await model.findOne({ _id: id, isDeleted: false }),
  update: async (id, data) =>
    await model.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    ),
  delete: async (id) =>
    await model.findByIdAndUpdate(id, { isDeleted: true }, { new: true }),
  getOne: async (filter = {}) =>
    await model.findOne({ ...filter, isDeleted: false }),
  getByPatientID: async (patientID) =>
    await model.find({ patientID, isDeleted: false }),
});
