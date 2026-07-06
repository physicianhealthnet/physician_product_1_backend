import Supplier from "../models/supplier.model.js";
import { createDBService } from "../services/db.service.js";

const supplierService = createDBService(Supplier);

export const addSupplierController = async (req, res) => {
  try {
    // Create a new supplier using the service
    const newSupplier = await supplierService.create(req.body);

    return res.status(201).json({
      message: "Supplier added successfully",
      data: newSupplier,
    });
  } catch (error) {
    console.error("Add Supplier Error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

/**
 * @desc Update an existing supplier
 * @route PATCH /api/supplier/update/:id
 */
export const updateSupplierController = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedSupplier = await supplierService.update(id, req.body);

    if (!updatedSupplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    return res.status(200).json({
      message: "Supplier updated successfully",
      data: updatedSupplier,
    });
  } catch (error) {
    console.error("Update Supplier Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * @desc Delete a supplier
 * @route DELETE /api/supplier/delete/:id
 */
export const deleteSupplierController = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedSupplier = await supplierService.update(id, {
      isDeleted: true,
    });

    if (!deletedSupplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    return res.status(200).json({ message: "Supplier deleted successfully" });
  } catch (error) {
    console.error("Delete Supplier Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * @desc Get all suppliers
 * @route GET /api/supplier/get-all
 */
export const getAllSupplierController = async (req, res) => {
  try {
    const suppliers = await supplierService.getAll({ isDeleted: false });
    return res.status(200).json({
      message: "Suppliers fetched successfully",
      data: suppliers,
    });
  } catch (error) {
    console.error("Get All Suppliers Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * @desc Get supplier by ID
 * @route GET /api/supplier/get/:id
 */
export const getByIdSupplierController = async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await supplierService.getOne({
      _id: id,
      isDeleted: false,
    });

    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    return res.status(200).json({
      message: "Supplier fetched successfully",
      data: supplier,
    });
  } catch (error) {
    console.error("Get Supplier by ID Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
