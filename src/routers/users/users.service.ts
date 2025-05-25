// user.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PostgresService } from '../../database/postgres.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly postgresService: PostgresService) { }

  //Thêm mới User
  async createUser(
    email: string,
    name: string
    // passwordHash: string,
  ): Promise<{ email: string, name: string }> {
    try {
      const result = await this.postgresService.execute<{ email: string, name: string }>(
        `
        INSERT INTO sys_user (email, name, created_at)
        VALUES ($1, $2, NOW())
        RETURNING email,name
        `,
        [email, name],
      );
      this.logger.log(`Created user ${email}`);
      return result[0];
    } catch (error) {
      this.logger.error(`Failed to create user ${email}`, error.stack);
      throw error;
    }
  }

  // Thêm mới refreshToken cho 1 user
  async updateRefreshToken(
    email: string,
    refreshToken: string,
  ): Promise<boolean> {
    try {
      await this.postgresService.executeInTransaction([
        {
          sql: `
            UPDATE sys_user 
            SET refresh_token = $1, updated_at = NOW()
            WHERE email = $2
          `,
          params: [refreshToken, email],
        },
      ]);

      this.logger.log(`Updated refreshToken for user ${email}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to update refreshToken for user ${email}`,
        error.stack,
      );
      throw error;
    }
  }

  // Lấy thông tin user bằng email
  async getUserByEmail(email: string) {
    try {
      const result = await this.postgresService.execute<{ id: string }>(
        "SELECT id FROM sys_user WHERE email = $1",
        [email]
      );

      if (result.length === 0) {
        this.logger.warn(`User with email ${email} not found`);
        return null;
      }

      this.logger.log(`Get user by email ${email} success`);
      return result[0]; // Trả về user đầu tiên tìm thấy
    } catch (error) {
      this.logger.error(
        `Failed to get user by email ${email}`,
        error.stack,
      );
      throw error;
    }
  }

  // Lấy thông tin user bằng id
  async getUserById(id: string) {
    try {
      const result = await this.postgresService.execute<{ id: string }>(
        "SELECT id, email, name, created_at, updated_at FROM sys_user WHERE id = $1",
        [id]
      );

      if (result.length === 0) {
        this.logger.warn(`User with id ${id} not found`);
        return null;
      }

      this.logger.log(`Get user by id ${id} success`);
      return result[0]; // Trả về user đầu tiên tìm thấy
    } catch (error) {
      this.logger.error(
        `Failed to get user by id ${id}`,
        error.stack,
      );
      throw error;
    }
  }

  //
  async validateUserByPayload(payload: { sub: string; email: string }) {
    const user = await this.getUserByEmail(payload.email);
    return user;
  }
}