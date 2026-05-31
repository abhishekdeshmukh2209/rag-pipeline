package com.example.ragdemo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record SourceSummary(String source, @JsonProperty("chunk_count") long chunkCount) {}
