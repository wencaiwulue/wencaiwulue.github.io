import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';
import RECENT_POSTS from '@site/src/generated/recent-posts.json';

function RecentPosts() {
  if (!RECENT_POSTS || RECENT_POSTS.length === 0) {
    return null;
  }

  return (
    <section className={clsx('container', styles.recentSection)}>
      <Heading as="h1" className={styles.sectionTitle}>
        最近文章
      </Heading>
      <ul className={styles.recent}>
        {RECENT_POSTS.map((post) => (
          <li key={post.to} className={styles.recentItem}>
            <Link to={post.to}>{post.title}</Link>
            <time className={styles.date} dateTime={post.date}>{post.date}</time>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Home() {
  return (
    <Layout
      title="技术知识库"
      description="大模型、Kubernetes、Cloud IDE、云原生实践与阅读思考">
      <main>
        <RecentPosts/>
      </main>
    </Layout>
  );
}
