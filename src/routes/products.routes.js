import { Router } from "express";
import { getProducts } from "../controllers/products.controller.js";

const router = Router();

// Use GET since this is fetching products
router.route("/products").get(getProducts);

export default router;
