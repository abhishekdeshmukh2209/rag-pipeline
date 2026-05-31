package com.example.ragdemo.dto;

import java.util.List;

public record AskResponse(String answer, List<ContextSnippet> context, List<String> steps) {}
