import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# Agregar el directorio actual al PYTHONPATH para permitir la importación de módulos locales
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Importar la URL de la base de datos y la metadata de los modelos ORM
from database import DATABASE_URL
from models import Base

# Objeto de configuración de Alembic
config = context.config

# Sobrescribir la URL de conexión en la configuración con la obtenida de las variables de entorno
config.set_main_option("sqlalchemy.url", DATABASE_URL)

# Configurar el sistema de logging si el archivo de configuración existe
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Metadata de SQLAlchemy utilizada para la autodetección de cambios (autogenerate)
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """
    Ejecución de migraciones en modo 'offline'.
    Configura el contexto únicamente con una URL y sin crear un motor de base de datos.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Ejecución de migraciones en modo 'online'.
    Crea una conexión con la base de datos MySQL y aplica las operaciones de migración.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
