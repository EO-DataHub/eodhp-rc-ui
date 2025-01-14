import { AnchorHTMLAttributes } from 'react'
import { Link } from '@radix-ui/themes'
import ReactMarkdown from 'react-markdown'
import rehypeMathjax from 'rehype-mathjax'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

export default function IndicatorDetailsFormatter({
  indicatorDetails,
}: {
  indicatorDetails: string | null | undefined
}) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeMathjax]}
      components={{
        a: (props: AnchorHTMLAttributes<HTMLAnchorElement>) => {
          return (
            <Link target="_blank" href={props.href}>
              {props.children}
            </Link>
          )
        },
      }}
    >
      {indicatorDetails}
    </ReactMarkdown>
  )
}
