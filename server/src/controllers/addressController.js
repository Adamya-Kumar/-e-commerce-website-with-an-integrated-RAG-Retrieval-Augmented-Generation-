import {
  createAddress,
  deleteAddress,
  listAddresses,
  updateAddress,
} from '../services/addressService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getAddresses = asyncHandler(async (req, res) => {
  const addresses = await listAddresses(req.user.id);
  res.json({ data: addresses });
});

export const postAddress = asyncHandler(async (req, res) => {
  const address = await createAddress(req.user.id, req.body);
  res.status(201).json({ data: address });
});

export const putAddress = asyncHandler(async (req, res) => {
  const address = await updateAddress(req.user.id, req.params.id, req.body);
  res.json({ data: address });
});

export const removeAddress = asyncHandler(async (req, res) => {
  const result = await deleteAddress(req.user.id, req.params.id);
  res.json({ data: result });
});
