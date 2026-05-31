package com.example.ragdemo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record HealthResponse(String status, @JsonProperty("chunks_indexed") int chunksIndexed) {}
