import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import { Pool, PoolClient, QueryConfig, QueryResult } from 'pg'

@Injectable()
export class PostgresService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PostgresService.name)
  private pool: Pool

  constructor() {
    this.pool = new Pool(this.getPoolConfig())
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.pool.connect() // Thử kết nối để xác minh cấu hình đúng
      this.logger.log('PostgreSQL connection pool started successfully')
    } catch (error) {
      this.logger.error('Failed to create PostgreSQL connection pool', error.stack)
      throw error
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.pool.end()
      this.logger.log('PostgreSQL pool closed gracefully')
    } catch (error) {
      this.logger.error('Failed to close PostgreSQL pool', error.stack)
    }
  }

  private getPoolConfig() {
    return {
      user: process.env.MASTER_PG_USER,
      password: process.env.MASTER_PG_PASSWORD,
      host: process.env.MASTER_PG_HOST,
      port: Number(process.env.MASTER_PG_PORT || 5432),
      database: process.env.MASTER_PG_DATABASE,
      max: 10,
      idleTimeoutMillis: 60000,
    }
  }

  private async withConnection<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect()
    try {
      return await operation(client)
    } finally {
      client.release()
    }
  }

  async execute<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    return this.withConnection(async (client) => {
      try {
        const result = await client.query<T>(sql, params)
        this.logger.debug(`Executed SQL: ${sql}`)
        return result.rows
      } catch (error) {
        this.logger.error(`SQL Error: ${sql}`, error.stack)
        throw error
      }
    })
  }

  async executeInTransaction(queries: { sql: string; params?: any[] }[]): Promise<void> {
    return this.withConnection(async (client) => {
      try {
        await client.query('BEGIN')
        for (const { sql, params = [] } of queries) {
          await client.query(sql, params)
          this.logger.debug(`Executed in transaction: ${sql}`)
        }
        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK')
        this.logger.error('Transaction failed', error.stack)
        throw error
      }
    })
  }
}
