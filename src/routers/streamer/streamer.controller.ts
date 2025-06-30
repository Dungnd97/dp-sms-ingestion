import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, HttpCode } from '@nestjs/common'
import { StreamerService } from './streamer.service'
import { UpdateToStreamerDTO } from './dto/update-to-streamer'
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { MessagePattern } from '@nestjs/microservices'
import { plainToInstance } from 'class-transformer'
import { StreamerInfoShareDto } from './dto/streamer-info-share-dto'

@Controller('streamer')
export class StreamerController {
  constructor(private readonly streamerService: StreamerService) {}

  @ApiBearerAuth('jwt')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Lấy dữ liệu thông tin người dùng sau khi đăng nhập thành công' })
  @ApiResponse({ status: 200, description: 'Thông tin người dùng hiện tại' })
  @Post('/update-to-streamer')
  @HttpCode(200)
  updateToStreamer(@Body() updateToStreamerDTO: UpdateToStreamerDTO, @Req() req) {
    return this.streamerService.updateToSteamer(updateToStreamerDTO, req.user)
  }
  @ApiBearerAuth('jwt')
  @UseGuards(AuthGuard('jwt'))
  @Post('/get-info-streamer')
  @HttpCode(200)
  getInfoStreamer(@Body() body: { amount: number; slugLink?: string; id?: string }) {
    return this.streamerService.getInfoStreamer(body.amount, body.slugLink, body.id)
  }

  @MessagePattern('get-info-streamer')
  async handleGetInfoStreamer(payload: { amount: number; slugLink?: string; id?: string }) {
    const streamerInfo = await this.streamerService.getInfoStreamer(payload.amount, payload.slugLink, payload.id)

    return plainToInstance(StreamerInfoShareDto, streamerInfo, {
      excludeExtraneousValues: true,
    })
  }
}
