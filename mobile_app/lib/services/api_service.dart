import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/task.dart';

class ApiService {
  static const String baseDomain = 'Nguyens-Mac-mini.local:3000';
  static const String baseUrl = 'http://$baseDomain/api/tasks';
  static const String authUrl = 'http://$baseDomain/api/auth';
  
  static String? _sessionCookie;

  static Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _sessionCookie = prefs.getString('sessionCookie');
  }

  static Future<void> _saveCookie(http.Response response) async {
    final setCookie = response.headers['set-cookie'];
    if (setCookie != null) {
      // Very basic cookie parsing for 'session=...'
      final sessionPart = setCookie.split(';').firstWhere(
        (part) => part.trim().startsWith('session='),
        orElse: () => '',
      );
      if (sessionPart.isNotEmpty) {
        _sessionCookie = sessionPart.trim();
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('sessionCookie', _sessionCookie!);
      }
    }
  }

  static Future<void> logout() async {
    _sessionCookie = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('sessionCookie');
  }

  Map<String, String> get _headers {
    final headers = <String, String>{
      'Content-Type': 'application/json; charset=UTF-8',
    };
    if (_sessionCookie != null) {
      headers['Cookie'] = _sessionCookie!;
    }
    return headers;
  }

  Future<void> login(String email, String password) async {
    final response = await http.post(
      Uri.parse('$authUrl/login'),
      headers: {'Content-Type': 'application/json; charset=UTF-8'},
      body: jsonEncode({'email': email, 'password': password}),
    );

    if (response.statusCode == 200) {
      await _saveCookie(response);
    } else {
      final body = jsonDecode(response.body);
      throw Exception(body['error'] ?? 'Login failed');
    }
  }

  Future<void> register(String email, String password, String fullName) async {
    final response = await http.post(
      Uri.parse('$authUrl/register'),
      headers: {'Content-Type': 'application/json; charset=UTF-8'},
      body: jsonEncode({'email': email, 'password': password, 'fullName': fullName}),
    );

    if (response.statusCode == 201 || response.statusCode == 200) {
      await _saveCookie(response);
    } else {
      final body = jsonDecode(response.body);
      throw Exception(body['error'] ?? 'Registration failed');
    }
  }

  Future<List<Task>> fetchTasks({int page = 1, int limit = 10}) async {
    final response = await http.get(
      Uri.parse('$baseUrl?page=$page&limit=$limit'),
      headers: _headers,
    );
    
    if (response.statusCode == 200) {
      final Map<String, dynamic> body = json.decode(response.body);
      Iterable l = body['data'];
      return List<Task>.from(l.map((model) => Task.fromJson(model)));
    } else {
      throw Exception('Failed to load tasks');
    }
  }

  Future<Task> createTask(String title) async {
    final response = await http.post(
      Uri.parse(baseUrl),
      headers: _headers,
      body: jsonEncode(<String, String>{
        'title': title,
      }),
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      return Task.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Failed to create task');
    }
  }

  Future<void> deleteTask(String id) async {
    final response = await http.delete(
      Uri.parse(baseUrl),
      headers: _headers,
      body: jsonEncode(<String, String>{
        'id': id,
      }),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to delete task');
    }
  }

  Future<void> updateTask(String id, bool completed) async {
    final response = await http.put(
      Uri.parse(baseUrl),
      headers: _headers,
      body: jsonEncode(<String, dynamic>{
        'id': id,
        'completed': completed,
      }),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to update task');
    }
  }

  Stream<String> chatStream(List<Map<String, String>> messages, String modelName) async* {
    final request = http.Request('POST', Uri.parse('http://$baseDomain/api/chat'));
    request.headers.addAll(_headers);
    request.body = jsonEncode(<String, dynamic>{
      'messages': messages,
      'modelName': modelName,
    });

    final client = http.Client();
    try {
      final response = await client.send(request);
      
      if (response.statusCode == 200) {
        await for (final chunk in response.stream.transform(utf8.decoder)) {
          yield chunk;
        }
      } else {
        throw Exception('Failed to send chat: ${response.statusCode}');
      }
    } finally {
      client.close();
    }
  }

  static Future<void> extractMemory(List<Map<String, String>> messages) async {
    try {
      await http.post(
        Uri.parse('http://$baseDomain/api/memory/extract'),
        headers: {'Content-Type': 'application/json; charset=UTF-8'},
        body: jsonEncode({'messages': messages}),
      );
    } catch (e) {
      print('Memory extract error: $e');
    }
  }
}
