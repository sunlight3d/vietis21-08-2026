import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class ChatMessage {
  String text;
  final bool isUser;

  ChatMessage({required this.text, required this.isUser});

  Map<String, dynamic> toJson() => {
        'text': text,
        'isUser': isUser,
      };

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      text: json['text'] ?? '',
      isUser: json['isUser'] ?? false,
    );
  }
}

class _ChatScreenState extends State<ChatScreen> {
  final ApiService _apiService = ApiService();
  final TextEditingController _controller = TextEditingController();
  final List<ChatMessage> _messages = [];
  bool _isLoading = false;

  final List<String> _models = [
    'gemini-3.5-flash',
    'glm-5.2:cloud',
    'qwen3.5:397b-cloud',
    'llama3.1:8b',
    'gpt-oss:120b-cloud',
    'deepseek-v4-pro:cloud',
    'kimi-k2.7-code:cloud',
    'minimax-m2.5:cloud'
  ];
  String _selectedModel = 'gemini-3.5-flash';

  @override
  void initState() {
    super.initState();
    _loadMessages();
  }

  Future<void> _loadMessages() async {
    final prefs = await SharedPreferences.getInstance();
    final String? messagesJson = prefs.getString('chat_history');
    if (messagesJson != null) {
      try {
        final List<dynamic> decodedList = jsonDecode(messagesJson);
        setState(() {
          _messages.clear();
          _messages.addAll(decodedList.map((e) => ChatMessage.fromJson(e)).toList());
        });
      } catch (e) {
        // Ignored decode error
      }
    }
  }

  Future<void> _saveMessages() async {
    final prefs = await SharedPreferences.getInstance();
    final String messagesJson = jsonEncode(_messages.map((m) => m.toJson()).toList());
    await prefs.setString('chat_history', messagesJson);
  }

  Future<void> _sendMessage() async {
    if (_controller.text.trim().isEmpty) return;

    final userText = _controller.text.trim();
    setState(() {
      _messages.insert(0, ChatMessage(text: userText, isUser: true));
      _messages.insert(0, ChatMessage(text: '', isUser: false)); // Placeholder for bot response
      _controller.clear();
      _isLoading = true;
    });
    
    // Save user message immediately
    await _saveMessages();

    try {
      final contextWindowSize = 5;
      final contextMessages = _messages
          .skip(1)
          .take(contextWindowSize)
          .toList()
          .reversed
          .map((m) => {
                'role': m.isUser ? 'user' : 'model',
                'content': m.text,
              })
          .toList();

      if (_messages.length > contextWindowSize + 1) {
        final dropped = _messages
            .skip(contextWindowSize + 1)
            .take(2)
            .toList()
            .reversed
            .map((m) => {
                  'role': m.isUser ? 'user' : 'model',
                  'content': m.text,
                })
            .toList();
        ApiService.extractMemory(dropped);
      }

      final stream = _apiService.chatStream(contextMessages, _selectedModel);
      await for (final chunk in stream) {
        if (!mounted) break;
        setState(() {
          _messages[0].text += chunk;
          _isLoading = false; // Hide loading indicator once first chunk arrives
        });
      }
      // Save bot response after streaming finishes
      await _saveMessages();
    } catch (e) {
      if (mounted) {
        setState(() {
          _messages[0].text = 'Lỗi: ${e.toString()}';
        });
        await _saveMessages();
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Trợ lý AI'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        actions: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8.0),
            child: DropdownButton<String>(
              value: _selectedModel,
              dropdownColor: Theme.of(context).colorScheme.inversePrimary,
              underline: const SizedBox(),
              items: _models.map((String model) {
                return DropdownMenuItem<String>(
                  value: model,
                  child: Text(
                    model,
                    style: const TextStyle(fontSize: 14),
                  ),
                );
              }).toList(),
              onChanged: (String? newValue) {
                if (newValue != null) {
                  setState(() {
                    _selectedModel = newValue;
                  });
                }
              },
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView.builder(
                reverse: true,
                padding: const EdgeInsets.all(16.0),
                itemCount: _messages.length,
                itemBuilder: (context, index) {
                  final msg = _messages[index];
                  return Container(
                    margin: const EdgeInsets.symmetric(vertical: 4.0),
                    alignment: msg.isUser
                        ? Alignment.centerRight
                        : Alignment.centerLeft,
                    child: Container(
                      padding: const EdgeInsets.all(12.0),
                      decoration: BoxDecoration(
                        color: msg.isUser
                            ? Colors.blue
                            : Colors.grey.shade300,
                        borderRadius: BorderRadius.circular(16.0),
                      ),
                      child: msg.isUser 
                          ? Text(
                              msg.text,
                              style: const TextStyle(color: Colors.white),
                            )
                          : MarkdownBody(
                              data: msg.text,
                              styleSheet: MarkdownStyleSheet(
                                p: const TextStyle(color: Colors.black, fontSize: 15),
                              ),
                            ),
                    ),
                  );
                },
              ),
            ),
            if (_isLoading)
              const Padding(
                padding: EdgeInsets.all(8.0),
                child: Row(
                  children: [
                    SizedBox(width: 8),
                    SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                    SizedBox(width: 8),
                    Text('AI đang suy nghĩ...', style: TextStyle(color: Colors.grey)),
                  ],
                ),
              ),
            Padding(
              padding: const EdgeInsets.all(8.0),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      decoration: const InputDecoration(
                        hintText: 'Nhập câu hỏi của bạn...',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.all(Radius.circular(24.0)),
                        ),
                        contentPadding: EdgeInsets.symmetric(horizontal: 16.0),
                      ),
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                  const SizedBox(width: 8.0),
                  CircleAvatar(
                    backgroundColor: Colors.blue,
                    child: IconButton(
                      icon: const Icon(Icons.send, color: Colors.white),
                      onPressed: _sendMessage,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
