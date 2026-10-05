import { discountRate } from '@/modules/catalog/catalog.mappers';
import { slugify } from '@/utils/slugify';

describe('slugify', () => {
  it.each([
    ['Jüt Hasır Halı', 'jut-hasir-hali'],
    ['ASİTANE SERİSİ', 'asitane-serisi'],
    ['Seri Sonu Fırsatı', 'seri-sonu-firsati'],
    ['  Göbekli   Halı!! ', 'gobekli-hali'],
    ['Çiçekli Şönil Öğe', 'cicekli-sonil-oge'],
  ])('%p → %p', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe('discountRate', () => {
  it('indirim oranını yuvarlar', () => expect(discountRate(750, 1000)).toBe(25));
  it('eski fiyat yoksa null döner', () => expect(discountRate(750, null)).toBeNull());
  it('eski fiyat daha düşükse null döner', () => expect(discountRate(1000, 900)).toBeNull());
});
