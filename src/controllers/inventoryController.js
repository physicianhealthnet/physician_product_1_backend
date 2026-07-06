import inventoryModel from "../models/inventory.model.js";
import Inventory from "../models/inventory.model.js";
import { createDBService } from "../services/db.service.js";

const inventoryService = createDBService(Inventory);

export const addProduct = async (req, res) => {
  try {
    const { productName, productCurrentCount, productTotalCount } = req.body;

    if (!productName || !productTotalCount) {
      return res.status(400).json({ message: "Missing required field" });
    }

    const existingProducts = await inventoryService.getAll({
      isDeleted: false,
    });
    const productExists = existingProducts.some(
      (p) => p.productName.toLowerCase() === productName.toLowerCase()
    );

    if (productExists) {
      return res.status(400).json({ message: "Product already in inventory" });
    }

    // Create new product
    const product = await inventoryService.create({
      productName: productName,
      productTotalCount: productTotalCount,
      productCurrentCount: productTotalCount,
    });

    return res.status(201).json({
      message: "Product added to inventory successfully",
      data: product,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getProduct = async (req, res) => {
  try {
    const product = await inventoryService.getAll({ isDeleted: false });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json({
      message: "product fetched successfully",
      product,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTargetedProduct = async (req, res) => {
  try {
    const { name } = req.params;

    if (!name) {
      return res.status(400).json({ message: "Name is Missing" });
    }

    const product = await inventoryModel.findOne({
      productName: name,
      isDeleted: false,
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getProductName = async (req, res) => {
  try {
    const products = await inventoryService.getAll({ isDeleted: false });
    if (!products || products.length === 0) {
      return res.status(404).json({ message: "No products found" });
    }

    const productNames = products.map((item) => item.productName);

    return res.status(200).json({
      message: "Product names fetched successfully",
      data: productNames,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        message: "Id Missing",
      });
    }
    const product = await inventoryService.update(id, req.body);
    return res.status(200).json({
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        message: "Id Missing",
      });
    }
    const product = await inventoryService.update(id, { isDeleted: true });
    return res.status(200).json({
      message: "Product deleted successfully",
      data: product,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
