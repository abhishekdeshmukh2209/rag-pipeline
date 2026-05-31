package com.example.ragdemo;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.ragdemo.dto.AskResponse;
import com.example.ragdemo.service.RagService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class RagDemoApplicationTests {

  @Autowired private RagService ragService;

  @Test
  void contextLoads() {}

  @Test
  void askReturnsGroundedAnswer() {
    AskResponse response = ragService.ask("What is chunk overlap?");
    assertThat(response.answer()).isNotBlank();
    assertThat(response.context()).isNotEmpty();
  }
}
