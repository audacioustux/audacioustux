package com.audacioustux

import io.micronaut.runtime.Micronaut.*

fun main(args: Array<String>) {
	build()
	    .args(*args)
		.packages("com.audacioustux")
		.start()
}

