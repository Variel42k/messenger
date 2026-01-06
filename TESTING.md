# Testing Guide for Messenger Application

This document outlines the testing strategy and examples for the Messenger application.

## Unit Tests

### Service Layer Tests
```java
// Example test for UserService
@Test
public void testFindByUsername() {
    User user = new User("testuser", "test@example.com", "password");
    when(userRepository.findByUsername("testuser")).thenReturn(Mono.just(user));
    
    StepVerifier.create(userService.findByUsername("testuser"))
                .expectNext(user)
                .verifyComplete();
}
```

### Repository Layer Tests
```java
@DataJpaTest
public class UserRepositoryTest {
    
    @Autowired
    private TestEntityManager entityManager;
    
    @Autowired
    private UserRepository userRepository;
    
    @Test
    public void shouldFindUserByUsername() {
        // Given
        User user = new User("testuser", "test@example.com", "password");
        entityManager.persistAndFlush(user);
        
        // When & Then
        assertThat(userRepository.findByUsername("testuser").block().getUsername())
            .isEqualTo("testuser");
    }
}
```

## Integration Tests

### Controller Tests
```java
@WebFluxTest(AuthController.class)
@Import({JwtTokenProvider.class, UserService.class})
public class AuthControllerTest {
    
    @Autowired
    private WebTestClient webTestClient;
    
    @MockBean
    private UserService userService;
    
    @MockBean
    private ReactiveAuthenticationManager authenticationManager;
    
    @Test
    public void shouldRegisterUser() {
        UserRegistrationRequest request = new UserRegistrationRequest();
        request.setUsername("testuser");
        request.setEmail("test@example.com");
        request.setPassword("password");
        
        User user = new User("testuser", "test@example.com", "password");
        when(userService.findByUsernameOrEmail(anyString())).thenReturn(Mono.empty());
        when(userService.save(any(User.class))).thenReturn(Mono.just(user));
        
        webTestClient.post()
                .uri("/api/auth/register")
                .bodyValue(request)
                .exchange()
                .expectStatus().isOk();
    }
}
```

## WebSocket/STOMP Tests

### WebSocket Integration Test
```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class WebSocketIntegrationTest {
    
    @Autowired
    private WebSocketTestClient webSocketTestClient;
    
    @LocalServerPort
    private int port;
    
    @Test
    public void shouldSendMessage() throws Exception {
        WebSocketSession session = webSocketTestClient
            .connect("ws://localhost:" + port + "/ws")
            .send("CONNECT\naccept-version:1.2\nheart-beat:1000,10000\n\n\u0000")
            .next();
        
        // Subscribe to chat
        session.send("SUBSCRIBE\nid:sub-0\ndestination:/topic/chat.1\n\n\u0000");
        
        // Send message
        session.send("SEND\ndestination:/app/chat.send\ncontent-type:application/json\n\n" +
                    "{\"chatId\":1,\"senderId\":1,\"content\":\"Hello\"}\u0000");
        
        // Verify message received
        Flux<String> messages = session.receive()
            .map(TextMessage::getPayload)
            .take(1);
        
        StepVerifier.create(messages)
            .expectNext("{\"chatId\":1,\"senderId\":1,\"content\":\"Hello\"}")
            .verifyComplete();
    }
}
```

## Load Testing

### JMeter Test Plan Example
```
Test Plan
  Thread Group (100 users, ramp-up 10s, loop 10)
    HTTP Request Defaults
      Server: localhost
      Port: 8080
    HTTP Header Manager
      Content-Type: application/json
    Login Request
      POST /api/auth/login
      Body: {"username":"user1","password":"password"}
    Authorization Header (extracted from login response)
    WebSocket Sampler
      Connect to ws://localhost:8080/ws
      Send message to /app/chat.send
      Receive message from /topic/chat.1
    Logout Request
      POST /api/auth/logout
```

### Locust Test Example
```python
from locust import HttpUser, WebSocketUser, task, between

class MessengerUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        response = self.client.post("/api/auth/login", json={
            "username": "user1",
            "password": "password"
        })
        self.token = response.json()["accessToken"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    @task
    def send_message(self):
        self.client.post("/api/messages", json={
            "chatId": 1,
            "senderId": 1,
            "content": "Hello from load test"
        }, headers=self.headers)
    
    @task
    def get_messages(self):
        self.client.get("/api/messages/1", headers=self.headers)
```

## Security Tests

### OWASP Security Checklist
- [ ] SQL Injection: Parameterized queries used
- [ ] XSS: Input validation and output encoding
- [ ] CSRF: Protection enabled
- [ ] Authentication: JWT tokens with proper expiration
- [ ] Authorization: Role-based access control
- [ ] Session Management: Secure session handling
- [ ] Data Protection: Sensitive data encryption
- [ ] Error Handling: Generic error messages
- [ ] Transport Security: HTTPS enforced
- [ ] File Upload: Validation and secure storage

### Example Security Test
```java
@SpringBootTest
@AutoConfigureTestDatabase
public class SecurityTest {
    
    @Test
    @WithMockUser(roles = "USER")
    public void shouldAccessUserEndpoint() {
        // Test that user can access user-specific endpoints
        mockMvc.perform(get("/api/user/profile"))
               .andExpect(status().isOk());
    }
    
    @Test
    @WithMockUser(roles = "USER")
    public void shouldNotAccessAdminEndpoint() {
        // Test that user cannot access admin endpoints
        mockMvc.perform(get("/api/admin/users"))
               .andExpect(status().isForbidden());
    }
}