# Руководство по тестированию Messenger

## Модульные тесты

### Тесты сервисного слоя
```java
// Example: UserService test
@ExtendWith(MockitoExtension.class)
public class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    @Test
    public void testFindByUsername() {
        User user = new User("testuser", "test@example.com", "password");
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));

        Optional<User> result = userService.findByUsername("testuser");
        assertThat(result).isPresent();
        assertThat(result.get().getUsername()).isEqualTo("testuser");
    }
}
```

### Тесты репозиторного слоя
```java
@DataJpaTest
public class UserRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private UserRepository userRepository;

    @Test
    public void shouldFindUserByUsername() {
        User user = new User("testuser", "test@example.com", "password");
        entityManager.persistAndFlush(user);

        Optional<User> found = userRepository.findByUsername("testuser");
        assertThat(found).isPresent();
        assertThat(found.get().getUsername()).isEqualTo("testuser");
    }
}
```

## Интеграционные тесты

### Тесты контроллеров
```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
public class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    public void shouldRegisterUser() throws Exception {
        String body = """
            {"username":"testuser","email":"test@example.com","password":"Strong1!"}
            """;

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isOk());
    }

    @Test
    public void shouldRejectInvalidRegistration() throws Exception {
        String body = """
            {"username":"x","email":"bad","password":"1"}
            """;

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors").exists());
    }
}
```

## Нагрузочное тестирование

### Locust
```python
from locust import HttpUser, task, between

class MessengerUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        response = self.client.post("/api/auth/login", json={
            "username": "testuser",
            "password": "Strong1!"
        })
        self.token = response.json()["accessToken"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    @task
    def send_message(self):
        self.client.post("/api/messages/create",
            params={"chatId": 1, "content": "Hello from load test"},
            headers=self.headers)

    @task
    def get_messages(self):
        self.client.get("/api/messages/chat/1", headers=self.headers)
```

## Чеклист безопасности

- [x] SQL Injection: параметризованные запросы через JPA
- [x] XSS: валидация ввода, Jakarta Validation
- [x] IDOR: userId/senderId из JWT (@AuthenticationPrincipal)
- [x] Path Traversal: проверка filePath.startsWith(uploadDir)
- [x] Authentication: JWT с access/refresh токенами
- [x] Authorization: ролевой контроль (USER/ADMIN)
- [x] Validation: DTO с @Valid, GlobalExceptionHandler → 400
- [x] Input: @NotBlank, @Size, @Email на всех DTO
- [x] Transport Security: CORS из конфигурации
- [x] File Upload: Path Traversal защита, валидация