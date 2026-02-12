import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ProductQueryDto, isAdmin = false) {
    const { page = 1, limit = 20, category, search, isActive } = query;

    const where: any = {};
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive;
    if (!isAdmin) where.isActive = true; // Resellers only see active products
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { manufacturerSku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Exclude costPrice for non-admin users
    const variantSelect = isAdmin
      ? undefined
      : { id: true, sku: true, title: true, options: true, price: true, inventoryQty: true, isActive: true };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          variants: variantSelect ? { select: variantSelect } : true,
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    // Strip costPrice from products for resellers
    const data = isAdmin
      ? products
      : products.map(({ costPrice, ...p }) => p);

    return { products: data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, isAdmin = false) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    });

    if (!product) throw new NotFoundException('Product not found');

    if (!isAdmin) {
      const { costPrice, ...rest } = product;
      return {
        ...rest,
        variants: product.variants.map(({ costPrice: _, ...v }) => v),
      };
    }

    return product;
  }

  async create(dto: CreateProductDto) {
    const { variants, ...productData } = dto;

    return this.prisma.product.create({
      data: {
        ...productData,
        images: JSON.stringify(productData.images || []),
        customizationSchema: productData.customizationSchema
          ? JSON.stringify(productData.customizationSchema)
          : undefined,
        variants: variants
          ? {
              create: variants.map((v) => ({
                ...v,
                options: JSON.stringify(v.options || {}),
              })),
            }
          : undefined,
      },
      include: { variants: true },
    });
  }

  async update(id: string, data: Partial<CreateProductDto>) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Product not found');

    const { variants, ...productData } = data;

    return this.prisma.product.update({
      where: { id },
      data: {
        ...productData,
        images: productData.images ? JSON.stringify(productData.images) : undefined,
        customizationSchema: productData.customizationSchema
          ? JSON.stringify(productData.customizationSchema)
          : undefined,
      },
      include: { variants: true },
    });
  }

  async getCategories() {
    const categories = await this.prisma.product.findMany({
      where: { isActive: true, category: { not: null } },
      select: { category: true },
      distinct: ['category'],
    });
    return categories.map((c) => c.category).filter(Boolean);
  }
}
