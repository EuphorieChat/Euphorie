class NewsArticle {
  final String id;
  final String title;
  final String category;
  final String summary;
  final DateTime published;
  final bool isBreaking;
  final String sourceName;
  final String? url;

  NewsArticle({
    required this.id,
    required this.title,
    required this.category,
    required this.summary,
    required this.published,
    this.isBreaking = false,
    required this.sourceName,
    this.url,
  });

  factory NewsArticle.fromJson(Map<String, dynamic> json) {
    return NewsArticle(
      id: json['id'].toString(),
      title: json['title'] ?? '',
      category: json['category'] ?? 'General',
      summary: json['summary'] ?? '',
      published: DateTime.parse(json['published'] ?? DateTime.now().toIso8601String()),
      isBreaking: json['is_breaking'] ?? false,
      sourceName: json['source_name'] ?? 'News',
      url: json['url'],
    );
  }
}