package com.audacioustux

import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Get
import reactor.core.publisher.Mono
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*

@Controller("/api/\${api.version:v1}")
class GatewayController() {
    @Get(uri="/stream")
    fun stream(): Flow<Int> = 
               flowOf(1,2,3,4,5,6,7,8,9,10)
                  .onEach { delay(100) }
}