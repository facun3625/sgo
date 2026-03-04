-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "apellido" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "expediente" TEXT,
    "cod" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "access_level" TEXT NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "datos" (
    "id" SERIAL NOT NULL,
    "cod" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "domicilio_legal" TEXT,
    "postal_legal" TEXT,
    "localidad_legal" TEXT,
    "telefonos_legal" TEXT,
    "email_legal" TEXT,
    "expediente" TEXT,
    "folio" TEXT,
    "tipo" TEXT,
    "documento" TEXT,
    "tomo" TEXT,
    "domicilio_real" TEXT,
    "postal_real" TEXT,
    "localidad_real" TEXT,
    "cod_movil_legal" TEXT,
    "movil_legal" TEXT,
    "telefonos_real" TEXT,
    "cod_movil_real" TEXT,
    "movil_real" TEXT,
    "email_real" TEXT,
    "provincia_real" TEXT,
    "fecha_matriculacion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "datos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_expediente_key" ON "users"("expediente");

-- CreateIndex
CREATE UNIQUE INDEX "users_cod_key" ON "users"("cod");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "datos_cod_key" ON "datos"("cod");
