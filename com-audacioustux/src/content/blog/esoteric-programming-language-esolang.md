---
author: Tanjim Hossain
pubDatetime: 2017-05-06T02:40:49Z
title: Esoteric programming language (esolang)
postSlug: esoteric-programming-language-esolang
featured: false
draft: false
tags:
- esolang
- brainfuck
- lolcode
- malbolge
- intercal
- monkeys
- piet
- bangla
ogImage: "assets/piet.jpg"
description:
    The Bizarre World of Esoteric Programming Languages
---

আমরা কম বেশি সবাই C, python, C#, java ব্লা ব্লা ব্লা প্রোগ্রামিং ল্যাংগুয়েজের নাম শুনেছি। কিন্তু এগুলা বাদে আরো হাজারের উপরে প্রোগ্রামিং ল্যাংগুয়েজ আছে যা প্রোগ্রামাররা শুধু "proof of concept" হিসাবে বানায় যেগুলা ডেভেলপাররা কোনদিন সফ্টওয়্যার বানাতে ব্যবহার করেনা। কিন্তু ল্যাংগুয়েজ গুলা জাদুঘরে সাজায়ে রাখার মতন। কয়েকটার উদাহরন দেই:

1. brainfuck: এইটাই ল্যাঙ্গুয়েজ টার নাম। যেই ল্যাংগুয়েজের সিন্টেক্সে শুধু ৮ টা ক্যারেক্টার `<>+-.,[]` ছাড়া আর সব কিছু অর্থহীন।

    ```brainfuck
    ++++++++++[>+++++++>++++++++++>+++<<<-]>++.>+.+++++++
    ..+++.>++.<<+++++++++++++++.>.+++.------.--------.>+.
    ```

    এই সুন্দর দেখতে জিনিসটার আউটপুট "Hello World!" :3

2. Piet: এর সিন্টেক্সের জন্যে আছে 18 টা রং। হ্যা রং! কোন ক্যারেক্টার না। এর উদাহরন স্ক্রিনশটে দেয়া আছে। [এইখানে](http://www.dangermouse.net/esoteric/piet/samples.html) আরো স্যাম্পল দেয়া আছে।

3. whitespace: এই ল্যাংগুয়েজ দেখা যায়না। দেখবেন কিভাবে? এর সিন্টেক্স হিসাবে আছে ট্যাব(Tab), স্পেস(space), newline যা সিলেক্ট করে হাইলাইট না করলে বুঝাই যাবেনা কিছু লিখা আছে কিনা :3

4. LOLCODE: উদাহরন দেই আগে

    ```lolcode
    HAI 1.2
    CAN HAS STDIO?
    VISIBLE "HAI WORLD!"
    KTHXBYE
    ```

    এইখানে প্রথম লাইনে ভার্শন নাম্বার বলে দিতেছে। এইখানে `HAI` মানে আসলে "Hi!" :p
    `STDIO` লাইব্রেরির নাম। যারা C তে কোড লিখছেন তারা বুঝছেন কি করা হইছে এখানে
    `KTHBYE` মানে ok thanks bye :v

5. Malbolge: এই ল্যাংগুয়েজ এতই অদ্ভুত যে এর ক্রিয়েটর জীবনে একবারো এই জিনিস দিয়ে প্রোগ্রাম করেনি। উদাহরন:

    ```malbolge
    (=<`#9]~6ZY32Vx/4Rs+0No-&Jk)"Fh}|Bcy?`=*z]Kw%oG4UUS0/@-ejc(:'8dc
    ```

    যা "Hello World!" প্রিন্ট করবে -\_-

6. INTERCAL: "Compiler Language With No Pronounceable Acronym" এইটা একেবারে প্রথম দিকের esoteric language. এর ছোট্ট একটা hello world প্রোগ্রামের সাইজ 16 লাইন। তাই আর দিলাম না :3

7. Monkeys: এই ল্যাঙ্গুয়েজে ৭ টা বানর থাকবে, যাদের ১-৭ এর মধ্যে নাম্বার দেয়া থাকবে। বানর গুলাকে কিছু কাজ দেয়া হবে। আর পুরো প্রোগ্রামে ১৪ টা কলা থাকবে। কলা ছাড়া বানর কাজ করবে কেনো? :v আর এই কলা+বানর `10 * 10` একটা গ্রিডে সাজানো থাকবে। বানর গুলাকে কাজ দেয়া আর পুরো প্রোগ্রাম লিখতে এই কিওয়ার্ড গুলা ব্যবহার হয়। `NOP, UP, DOWN, LEFT, RIGHT, LEARN, YELL, PLAY, SLEEP, WAKE, GRAB, DROP, EAT, MARK, BACK, TEACH, FIGHT, BOND, EGO, END`। দেখেই বুঝতেছেন কি ধরনের অমানবিক(!) কাজ বানর দিয়ে করানো হয়। উদাহরন হিসাবে এই প্রোগ্রামটা দেখুন:

    ```monkeys
    1 MARK
    1 LEARN
    1 YELL
    1 BACK
    ```

    এখানে ১ নাম্বার বানর কে তার পজিশন মনে রাখতে বলতেছে -> `MARK`
    কন্সোল থেকে ইউজারের থেকে ইনপুট জানতে বলতেছে -> `LEARN`
    যা জানলো তা বলতে বলতেছে -> `YELL`
    যেই পজিশন প্রথম লাইনে মনে রাখছিল সেই যায়গায় ফেরত যেতে বলতেছে -> `BACK`
    In a bananshell, প্রোগ্রামটা ইউজারের কাছ থেকে যা ইনপুট নিতেছে তাই আউটপুট দিচ্ছে।

[এই লিস্টে](http://esolangs.org/wiki/Language_list) 1104 টা esoteric language এর বৈশিষ্ট্য + উদাহরন দেয়া আছে। ঘুম হারাম করতে না চাইলে দেখার দরকার নাই :3 :p
