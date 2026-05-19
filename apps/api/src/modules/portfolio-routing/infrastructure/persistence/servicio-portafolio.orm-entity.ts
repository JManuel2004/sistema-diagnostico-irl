import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'irl_catalog', name: 'servicio_portafolio' })
export class ServicioPortafolioOrm {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id_servicio' })
  idServicio!: number;

  @Column({ name: 'nombre', type: 'varchar', length: 80 })
  nombre!: string;

  @Column({ name: 'descripcion', type: 'varchar', length: 500, nullable: true })
  descripcion!: string | null;

  @Column({ name: 'activo', type: 'boolean', default: true })
  activo!: boolean;
}
