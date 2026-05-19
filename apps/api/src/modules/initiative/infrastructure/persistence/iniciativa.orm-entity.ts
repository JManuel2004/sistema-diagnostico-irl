import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'irl_diagnostic', name: 'iniciativa' })
export class IniciativaOrm {
  @PrimaryColumn({ name: 'id_iniciativa', type: 'uuid' })
  idIniciativa!: string;

  @Column({ name: 'id_diagnostico', type: 'uuid' })
  idDiagnostico!: string;

  @Column({ name: 'id_sector', type: 'bigint' })
  idSector!: string;

  @Column({ name: 'nombre', type: 'varchar', length: 200 })
  nombre!: string;

  @Column({ name: 'descripcion_breve', type: 'varchar', length: 1000 })
  descripcionBreve!: string;
}
