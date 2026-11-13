import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';

import Heading from '@theme/Heading';
import styles from './index.module.css';
import RECENT_POSTS from '@site/src/generated/recent-posts.json';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  const latestPost = RECENT_POSTS[0];
  return (
    <header className={clsx('hero', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className={styles.heroTitle}>
          {siteConfig.title}
        </Heading>
        <p className={styles.heroSubtitle}>
          {siteConfig.tagline}
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--primary button--lg"
            to="/quickstart"
          >
            一个用心的人
          </Link>
          <Link
            className="button button--outline button--lg"
            to={latestPost?.to || '/quickstart'}
          >
            开始阅读
          </Link>
        </div>
      </div>
    </header>
  );
}

function RecentPosts() {
  if (!RECENT_POSTS || RECENT_POSTS.length === 0) {
    return null;
  }

  return (
    <section className={clsx('container', styles.recentSection)}>
      <Heading as="h2" className={styles.sectionTitle}>
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
      <HomepageHeader/>
      <main>
        <HomepageFeatures/>
        <RecentPosts/>
      </main>
    </Layout>
  );
}
