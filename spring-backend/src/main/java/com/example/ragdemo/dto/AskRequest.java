package com.example.ragdemo.dto;

import jakarta.validation.constraints.NotBlank;

public record AskRequest(@NotBlank String question) {}
