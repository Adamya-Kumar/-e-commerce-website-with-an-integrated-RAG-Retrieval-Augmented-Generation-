import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

/** @param {string} userId */
export async function listAddresses(userId) {
  const user = await requireUser(userId);
  return user.addresses.map((address) => address.toJSON());
}

/**
 * @param {string} userId
 * @param {Record<string, unknown>} input
 */
export async function createAddress(userId, input) {
  const user = await requireUser(userId);
  const makeDefault = user.addresses.length === 0 || input.isDefault === true;
  if (makeDefault) {
    clearDefaults(user);
  }
  user.addresses.push({
    ...input,
    isDefault: makeDefault,
  });
  await user.save();
  return user.addresses[user.addresses.length - 1].toJSON();
}

/**
 * @param {string} userId
 * @param {string} addressId
 * @param {Record<string, unknown>} input
 */
export async function updateAddress(userId, addressId, input) {
  const user = await requireUser(userId);
  const address = user.addresses.id(addressId);
  if (!address) {
    throw ApiError.notFound('Address not found');
  }
  if (input.isDefault === true) {
    clearDefaults(user);
  }
  address.set(input);
  if (!user.addresses.some((entry) => entry.isDefault)) {
    address.isDefault = true;
  }
  await user.save();
  return address.toJSON();
}

/**
 * @param {string} userId
 * @param {string} addressId
 */
export async function deleteAddress(userId, addressId) {
  const user = await requireUser(userId);
  const address = user.addresses.id(addressId);
  if (!address) {
    throw ApiError.notFound('Address not found');
  }
  const wasDefault = address.isDefault;
  user.addresses.pull(addressId);
  if (wasDefault && user.addresses.length > 0) {
    user.addresses[0].isDefault = true;
  }
  await user.save();
  return { id: addressId };
}

/** @param {import('mongoose').Document} user */
function clearDefaults(user) {
  for (const entry of user.addresses) {
    entry.isDefault = false;
  }
}

/** @param {string} userId */
async function requireUser(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.unauthorized();
  }
  return user;
}
