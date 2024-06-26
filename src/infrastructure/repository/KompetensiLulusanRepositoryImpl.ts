import {PrismaClient} from '@prisma/client';
import {KompetensiLulusanRepository}
  from '../../domain/kompetensi_lulusan/KompetensiLulusanRepository';
import {
  GetAllKompetensiLulusanByIdSekolahInput,
  GetAllKompetensiLulusanByIdSekolahOutput,
  GetAllKompetensiLulusanByKodeOkupasiInput,
  GetAllKompetensiLulusanByKodeOkupasiOutput,
  KompetensiLulusanInput,
}
  from '../../domain/kompetensi_lulusan/entity/kompetensi-lulusan';
import {NotFoundError} from '../../common/error/NotFoundError';
import {countOffset} from '../../util/pagination';

// eslint-disable-next-line max-len
export class KompetensiLulusanRepositoryImpl implements KompetensiLulusanRepository {
  constructor(private readonly db: PrismaClient) {}

  async add(data: KompetensiLulusanInput[]): Promise<void> {
    await this.db.kompetensiLulusan.createMany({data});
  }

  async getAllByKodeOkupasi(
      req: GetAllKompetensiLulusanByKodeOkupasiInput,
  ): Promise<[number, GetAllKompetensiLulusanByKodeOkupasiOutput[]]> {
    const where = {
      nama: {
        contains: req.search,
      },
      kompetensi: {
        some: {
          kompetensi: {
            is: {
              kode_okupasi: req.kode_okupasi,
            },
          },
        },
      },
    };

    const [totalResult, data] = await Promise.all([
      this.db.sekolah.count({where}),
      this.db.sekolah.findMany({
        include: {
          kompetensi: {
            where: {
              kompetensi: {
                kode_okupasi: req.kode_okupasi,
              },
            },
            include: {
              kompetensi: true,
            },
          },
        },
        where,
        skip: countOffset(req.page, req.limit),
        take: req.limit,
      }),
    ]);

    const res: GetAllKompetensiLulusanByKodeOkupasiOutput[] = data.map((v) => {
      return {
        id: v.id,
        nama: v.nama,
        kota: v.kota,
        unit_kompetensi: v.kompetensi.map((kompetensi) => {
          const kompetensiOkupasi = kompetensi.kompetensi;
          return {
            id: kompetensiOkupasi.id,
            kode_okupasi: kompetensiOkupasi.kode_okupasi,
            nama: kompetensiOkupasi.nama,
          };
        }),
      };
    });

    return [totalResult, res];
  }

  async getAllByIdSekolah(
      req: GetAllKompetensiLulusanByIdSekolahInput,
  ): Promise<[number, GetAllKompetensiLulusanByIdSekolahOutput[]]> {
    const where = {
      nama: {
        contains: req.search,
        mode: 'insensitive' as 'insensitive',
      },
      unit_kompetensi: {
        some: {
          kompetensi_lulusan: {
            some: {id_sekolah: req.id_sekolah},
          },
        },
      },
    };

    return await Promise.all([
      this.db.okupasi.count({where}),
      this.db.okupasi.findMany({
        include: {
          unit_kompetensi: {
            select: {
              id: true,
              nama: true,
            },
            where: {
              kompetensi_lulusan: {
                some: {
                  id_sekolah: req.id_sekolah,
                },
              },
            },
          },
        },
        where,
        skip: countOffset(req.page, req.limit),
        take: req.limit,
      }),
    ]);
  }

  async delete(req: KompetensiLulusanInput): Promise<void> {
    await this.db.kompetensiLulusan.deleteMany({where: req});
  }

  async deleteByKodeOkupasi(idSekolah: string, kode: string): Promise<void> {
    await this.db.kompetensiLulusan.deleteMany({
      where: {
        id_sekolah: idSekolah,
        kompetensi: {
          kode_okupasi: kode,
        },
      },
    });
  }

  async verify(req: KompetensiLulusanInput): Promise<void> {
    const res = await this.db.kompetensiLulusan.count({where: req});
    if (!res) {
      throw new NotFoundError('unit kompetensi tidak ditemukan');
    }
  }

  async countByKode(idSekolah: string, kode: string): Promise<number> {
    return await this.db.kompetensiLulusan.count({
      where: {
        id_sekolah: idSekolah,
        kompetensi: {
          kode_okupasi: kode,
        },
      },
    });
  }
}
