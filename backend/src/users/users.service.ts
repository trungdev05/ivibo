import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(search?: string) {
    const data = await this.prisma.user.findMany({
      where: search
        ? { OR: [{ fullName: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] }
        : undefined,
      select: { id: true, fullName: true, email: true, avatarUrl: true, globalRole: true, departmentId: true },
      orderBy: { fullName: 'asc' },
    });
    return { data };
  }
}
