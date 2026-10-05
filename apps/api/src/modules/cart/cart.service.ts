import { randomUUID } from 'node:crypto';

import { loadConfig } from '@/config/Config';
import { AppError } from '@/utils/AppError';
import { roundMoney } from '@/utils/money';

import { type CartLineRow, CartRepository, type CartRow } from './cart.repository';
import { type CartDto, type CartItemDto, MAX_QUANTITY_PER_LINE } from './cart.schemas';
import { calculateTotals } from './pricing';

export interface CartOwner {
  userId?: number;
  token?: string;
}

export function toCartItem(l: CartLineRow): CartItemDto {
  const hasDiscount = l.discount_price !== null && Number(l.discount_price) < Number(l.price);
  const unitPrice = Number(hasDiscount ? l.discount_price : l.price);
  return {
    id: l.id,
    variantId: l.variant_id,
    productId: l.product_id,
    name: l.name,
    slug: l.slug,
    imageUrl: l.image_url,
    sku: l.sku,
    sizeLabel: l.size_label,
    unitPrice,
    oldUnitPrice: hasDiscount ? Number(l.price) : null,
    quantity: l.quantity,
    lineTotal: roundMoney(unitPrice * l.quantity),
    stock: l.stock,
    available: Boolean(l.variant_active) && Boolean(l.product_active) && l.stock >= l.quantity,
  };
}

export class CartService {
  constructor(private readonly repo = new CartRepository()) {}

  /**
   * Sepeti çözer: üye ise kullanıcının sepeti (yoksa oluşturulur); misafir sepet token'ı da
   * gönderildiyse o sepetteki ürünler üye sepetine taşınır. Misafir ise token'a ait sepet.
   */
  async resolve(owner: CartOwner, create = true): Promise<CartRow | undefined> {
    const guest = owner.token ? await this.repo.findByToken(owner.token) : undefined;

    if (!owner.userId) {
      if (guest && guest.user_id === null) return guest;
      return create ? this.repo.create(randomUUID(), null) : undefined;
    }

    const userCart = await this.repo.findByUser(owner.userId);
    if (!userCart) {
      if (guest && guest.user_id === null) {
        await this.repo.assignUser(guest.id, owner.userId);
        return { ...guest, user_id: owner.userId };
      }
      return create ? this.repo.create(randomUUID(), owner.userId) : undefined;
    }
    if (guest && guest.user_id === null && guest.id !== userCart.id) {
      await this.mergeInto(guest, userCart);
    }
    return userCart;
  }

  private async mergeInto(source: CartRow, target: CartRow): Promise<void> {
    await this.repo.transaction(async (trx) => {
      for (const line of await this.repo.lines(source.id, trx)) {
        const existing = await this.repo.findItemByVariant(target.id, line.variant_id, trx);
        const quantity = Math.min(MAX_QUANTITY_PER_LINE, line.quantity + (existing?.quantity ?? 0));
        if (existing) await this.repo.updateItemQuantity(existing.id, quantity, trx);
        else await this.repo.insertItem(target.id, line.variant_id, quantity, trx);
      }
      await this.repo.deleteCart(source.id, trx);
    });
  }

  async view(cart: CartRow): Promise<CartDto> {
    const items = (await this.repo.lines(cart.id)).map(toCartItem);
    const { commerce } = loadConfig();
    const totals = calculateTotals(items.map((i) => ({ unitPrice: i.unitPrice, quantity: i.quantity })), commerce);
    return {
      token: cart.token,
      items,
      itemCount: items.reduce((n, i) => n + i.quantity, 0),
      ...totals,
      freeShippingThreshold: commerce.freeShippingThreshold,
    };
  }

  async get(owner: CartOwner): Promise<CartDto> {
    return this.view((await this.resolve(owner))!);
  }

  async addItem(owner: CartOwner, variantId: number, quantity: number): Promise<CartDto> {
    const cart = (await this.resolve(owner))!;
    const variant = await this.repo.findVariant(variantId);
    if (!variant) throw AppError.notFound('Ürün seçeneği bulunamadı.');
    const existing = await this.repo.findItemByVariant(cart.id, variantId);
    const next = quantity + (existing?.quantity ?? 0);
    this.assertStock(variant.stock, next);
    if (existing) await this.repo.updateItemQuantity(existing.id, next);
    else await this.repo.insertItem(cart.id, variantId, quantity);
    return this.view(cart);
  }

  async updateItem(owner: CartOwner, itemId: number, quantity: number): Promise<CartDto> {
    const cart = (await this.resolve(owner))!;
    const item = await this.repo.findItem(cart.id, itemId);
    if (!item) throw AppError.notFound('Sepet kalemi bulunamadı.');
    const variant = await this.repo.findVariant(item.variant_id);
    if (!variant) throw AppError.conflict('Bu ürün artık satışta değil.');
    this.assertStock(variant.stock, quantity);
    await this.repo.updateItemQuantity(itemId, quantity);
    return this.view(cart);
  }

  async removeItem(owner: CartOwner, itemId: number): Promise<CartDto> {
    const cart = (await this.resolve(owner))!;
    const deleted = await this.repo.deleteItem(cart.id, itemId);
    if (!deleted) throw AppError.notFound('Sepet kalemi bulunamadı.');
    return this.view(cart);
  }

  private assertStock(stock: number, quantity: number): void {
    if (quantity > MAX_QUANTITY_PER_LINE) {
      throw AppError.badRequest(`Bir üründen en fazla ${MAX_QUANTITY_PER_LINE} adet eklenebilir.`);
    }
    if (stock < quantity) {
      throw AppError.conflict(stock === 0 ? 'Bu ebat tükendi.' : `Stokta yalnızca ${stock} adet var.`, { stock });
    }
  }
}
