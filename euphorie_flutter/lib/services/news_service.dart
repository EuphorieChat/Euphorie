import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class NewsService extends ChangeNotifier {
  List<NewsArticle> _articles = [];
  bool _isLoading = false;
  String? _error;

  List<NewsArticle> get articles => _articles;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadNews() async {
    _isLoading = true;
    notifyListeners();

    try {
      print('📰 Loading news from Crene...');
      final response = await http.get(
        Uri.parse('https://crene.com/api/articles/?limit=30'),
        headers: {'Accept': 'application/json'},
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final dynamic jsonData = json.decode(response.body);
        
        // Handle both array and object responses
        List<dynamic> articlesList;
        if (jsonData is List) {
          articlesList = jsonData;
        } else if (jsonData is Map && jsonData['results'] != null) {
          articlesList = jsonData['results'] as List;
        } else if (jsonData is Map && jsonData['articles'] != null) {
          articlesList = jsonData['articles'] as List;
        } else {
          throw Exception('Unexpected API response format');
        }
        
        _articles = articlesList.map((article) => NewsArticle.fromJson(article)).toList();
        _error = null;
        print('✅ Loaded ${_articles.length} articles from Crene');
      } else {
        _error = 'Failed to load news: ${response.statusCode}';
        print('❌ Failed to load news: ${response.statusCode}');
      }
    } catch (e) {
      _error = 'Error loading news: $e';
      print('❌ Error loading news: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> refresh() async {
    await loadNews();
  }
}

class NewsArticle {
  final String title;
  final String? summary;
  final String? imageUrl;
  final String? url;
  final String? publishedAt;

  NewsArticle({
    required this.title,
    this.summary,
    this.imageUrl,
    this.url,
    this.publishedAt,
  });

  factory NewsArticle.fromJson(Map<String, dynamic> json) {
    return NewsArticle(
      title: json['title'] ?? 'No Title',
      summary: json['summary'],
      imageUrl: json['image_url'],
      url: json['url'],
      publishedAt: json['published_at'],
    );
  }
}