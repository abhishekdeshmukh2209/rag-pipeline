package com.example.ragdemo.controller;

import com.example.ragdemo.dto.AskRequest;
import com.example.ragdemo.dto.AskResponse;
import com.example.ragdemo.dto.HealthResponse;
import com.example.ragdemo.dto.SourceSummary;
import com.example.ragdemo.service.RagService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class RagController {

  private final RagService ragService;

  public RagController(RagService ragService) {
    this.ragService = ragService;
  }

  @GetMapping("/health")
  public HealthResponse health() {
    return ragService.health();
  }

  @GetMapping("/sources")
  public List<SourceSummary> sources() {
    return ragService.sources();
  }

  @PostMapping("/ask")
  public AskResponse ask(@Valid @RequestBody AskRequest request) {
    return ragService.ask(request.question());
  }
}
